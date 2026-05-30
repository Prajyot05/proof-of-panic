//! Liquidation cascade engine.
//!
//! Evaluates each position against the shocked price and determines
//! which positions fall below the maintenance margin threshold.
//! Includes advanced market dynamics:
//! - Partial liquidations
//! - Liquidation fee deductions
//! - Iterative cascades with price impact

use crate::types::*;

pub fn evaluate_positions(
    positions: &mut [SimPosition],
    mut current_price: u64,
    risk_config: &SimRiskConfig,
) -> (Vec<PositionResult>, u64) {
    let mut results = vec![
        PositionResult {
            index: 0,
            unrealized_pnl: 0,
            margin_ratio_bps: 0,
            is_liquidated: false,
            liquidation_loss: 0,
            effective_collateral: 0,
        };
        positions.len()
    ];

    for i in 0..positions.len() {
        results[i].index = i;
    }

    let mut cascade_active = true;
    let price_impact_bps_per_100k = 50; // 50 bps (0.5%) per $100k liquidated

    while cascade_active {
        cascade_active = false;
        let mut total_liquidated_size_this_round = 0;

        for (i, pos) in positions.iter_mut().enumerate() {
            if !pos.is_open || pos.size == 0 {
                continue;
            }

            let pnl = compute_pnl(pos, current_price);
            let effective_collateral = pos.collateral as i64 + pnl;

            let margin_ratio_bps = if effective_collateral > 0 {
                (effective_collateral as u64)
                    .checked_mul(BPS_DENOMINATOR)
                    .unwrap_or(0)
                    / pos.size
            } else {
                0
            };

            // Update result tracking
            results[i].unrealized_pnl = pnl;
            results[i].margin_ratio_bps = margin_ratio_bps;
            results[i].effective_collateral = effective_collateral;

            if margin_ratio_bps < risk_config.maintenance_margin_bps {
                results[i].is_liquidated = true;
                cascade_active = true;

                // Close 50% of the position for partial liquidation
                let mut liquidate_size = pos.size / 2;
                
                // If severely underwater, liquidate fully
                if effective_collateral <= 0 || margin_ratio_bps < risk_config.maintenance_margin_bps / 2 {
                    liquidate_size = pos.size;
                }

                total_liquidated_size_this_round += liquidate_size;

                // Deduct liquidation fee
                let fee = liquidate_size
                    .checked_mul(risk_config.liquidation_fee_bps)
                    .unwrap_or(0)
                    / BPS_DENOMINATOR;

                if effective_collateral < 0 {
                    results[i].liquidation_loss += effective_collateral.unsigned_abs() + fee;
                } else {
                    let remaining = effective_collateral as u64;
                    if fee > remaining {
                        results[i].liquidation_loss += fee - remaining;
                    }
                }

                // Actually reduce position size
                pos.size -= liquidate_size;
                // Reduce collateral proportionally
                if pos.size == 0 {
                    pos.is_open = false;
                    pos.collateral = 0;
                } else {
                    pos.collateral = pos.collateral / 2; // Rough approximation for partial
                }
            }
        }

        // Apply price impact: price worsens based on liquidated size
        if total_liquidated_size_this_round > 0 {
            // How many 100k blocks were liquidated?
            let blocks = total_liquidated_size_this_round / (100_000 * SCALE);
            let impact_bps = blocks * price_impact_bps_per_100k;
            
            // Assume market trends down on mass liquidations (short squeeze logic could reverse this, 
            // but we'll assume a standard long-squeeze for simplicity).
            let price_drop = current_price
                .checked_mul(impact_bps)
                .unwrap_or(0)
                / BPS_DENOMINATOR;
            
            current_price = current_price.saturating_sub(price_drop);
        }
    }

    (results, current_price)
}

/// Compute unrealized PnL for a single position.
fn compute_pnl(position: &SimPosition, current_price: u64) -> i64 {
    if position.entry_price == 0 {
        return 0;
    }

    if position.is_long {
        if current_price >= position.entry_price {
            let gain = current_price - position.entry_price;
            let pnl = (position.size as u128 * gain as u128 / position.entry_price as u128) as u64;
            pnl as i64
        } else {
            let loss = position.entry_price - current_price;
            let pnl = (position.size as u128 * loss as u128 / position.entry_price as u128) as u64;
            -(pnl as i64)
        }
    } else {
        if current_price <= position.entry_price {
            let gain = position.entry_price - current_price;
            let pnl = (position.size as u128 * gain as u128 / position.entry_price as u128) as u64;
            pnl as i64
        } else {
            let loss = current_price - position.entry_price;
            let pnl = (position.size as u128 * loss as u128 / position.entry_price as u128) as u64;
            -(pnl as i64)
        }
    }
}
