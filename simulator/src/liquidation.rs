//! Liquidation cascade engine.
//!
//! Evaluates each position against the shocked price and determines
//! which positions fall below the maintenance margin threshold.
//!
//! SIMPLIFICATION: All positions are evaluated independently against
//! the shocked price. There is no cascading price impact from liquidations.
//! This is a deliberate design choice that keeps the Noir circuit manageable
//! while still demonstrating the core concept.

use crate::types::*;

/// Evaluate all positions against the shocked price and produce per-position results.
pub fn evaluate_positions(
    positions: &[SimPosition],
    shocked_price: u64,
    maintenance_margin_bps: u64,
) -> Vec<PositionResult> {
    let mut results = Vec::with_capacity(positions.len());

    for (i, pos) in positions.iter().enumerate() {
        if !pos.is_open {
            results.push(PositionResult {
                index: i,
                unrealized_pnl: 0,
                margin_ratio_bps: 0,
                is_liquidated: false,
                liquidation_loss: 0,
                effective_collateral: 0,
            });
            continue;
        }

        // Compute unrealized PnL
        let pnl = compute_pnl(pos, shocked_price);

        // Compute effective collateral (collateral + PnL)
        let effective_collateral = pos.collateral as i64 + pnl;

        // Compute margin ratio in basis points
        // margin_ratio = effective_collateral / size * 10000
        let margin_ratio_bps = if pos.size > 0 && effective_collateral > 0 {
            (effective_collateral as u64)
                .checked_mul(BPS_DENOMINATOR)
                .unwrap_or(0)
                / pos.size
        } else if effective_collateral <= 0 {
            0 // Underwater — margin is effectively zero or negative
        } else {
            BPS_DENOMINATOR // Position size is zero (shouldn't happen)
        };

        // Determine if position should be liquidated
        let is_liquidated = margin_ratio_bps < maintenance_margin_bps;

        // Compute liquidation loss (only for liquidated positions)
        let liquidation_loss = if is_liquidated {
            if effective_collateral < 0 {
                // Position is underwater — the entire negative amount is a loss
                effective_collateral.unsigned_abs()
            } else {
                // Position has some collateral but below margin —
                // the loss is the collateral deficit relative to a clean close
                0 // No bad debt, just an orderly liquidation
            }
        } else {
            0
        };

        results.push(PositionResult {
            index: i,
            unrealized_pnl: pnl,
            margin_ratio_bps,
            is_liquidated,
            liquidation_loss,
            effective_collateral,
        });
    }

    results
}

/// Compute unrealized PnL for a single position.
///
/// For LONG positions: PnL = size * (current_price - entry_price) / entry_price
/// For SHORT positions: PnL = size * (entry_price - current_price) / entry_price
///
/// Returns signed PnL in microdollars.
fn compute_pnl(position: &SimPosition, current_price: u64) -> i64 {
    if position.entry_price == 0 {
        return 0;
    }

    if position.is_long {
        // Long: profit when price goes up
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
        // Short: profit when price goes down
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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_long(collateral: u64, size: u64, entry_price: u64) -> SimPosition {
        SimPosition {
            owner: "00".repeat(32),
            collateral,
            size,
            entry_price,
            is_long: true,
            is_open: true,
        }
    }

    fn make_short(collateral: u64, size: u64, entry_price: u64) -> SimPosition {
        SimPosition {
            owner: "00".repeat(32),
            collateral,
            size,
            entry_price,
            is_long: false,
            is_open: true,
        }
    }

    #[test]
    fn test_long_profit() {
        let pos = make_long(10_000 * SCALE, 100_000 * SCALE, 100 * SCALE);
        let pnl = compute_pnl(&pos, 110 * SCALE); // 10% up
        assert_eq!(pnl, 10_000 * SCALE as i64); // $10k profit
    }

    #[test]
    fn test_long_loss() {
        let pos = make_long(10_000 * SCALE, 100_000 * SCALE, 100 * SCALE);
        let pnl = compute_pnl(&pos, 90 * SCALE); // 10% down
        assert_eq!(pnl, -(10_000 * SCALE as i64)); // $10k loss
    }

    #[test]
    fn test_short_profit_on_drop() {
        let pos = make_short(10_000 * SCALE, 100_000 * SCALE, 100 * SCALE);
        let pnl = compute_pnl(&pos, 90 * SCALE); // 10% down
        assert_eq!(pnl, 10_000 * SCALE as i64); // $10k profit
    }

    #[test]
    fn test_short_loss_on_rise() {
        let pos = make_short(10_000 * SCALE, 100_000 * SCALE, 100 * SCALE);
        let pnl = compute_pnl(&pos, 110 * SCALE); // 10% up
        assert_eq!(pnl, -(10_000 * SCALE as i64)); // $10k loss
    }

    #[test]
    fn test_liquidation_detection() {
        // Long 10x at $100 with $10k collateral
        // A 30% drop to $70 → PnL = -$30k → effective = $10k - $30k = -$20k
        // Margin ratio = negative → 0 bps → liquidated
        let positions = vec![make_long(10_000 * SCALE, 100_000 * SCALE, 100 * SCALE)];
        let results = evaluate_positions(&positions, 70 * SCALE, 500);
        assert!(results[0].is_liquidated);
        assert!(results[0].effective_collateral < 0);
    }

    #[test]
    fn test_healthy_position_survives() {
        // Long 2x at $100 with $50k collateral
        // A 10% drop to $90 → PnL = -$10k → effective = $50k - $10k = $40k
        // Margin ratio = 40k/100k * 10000 = 4000 bps → above 500 → safe
        let positions = vec![make_long(50_000 * SCALE, 100_000 * SCALE, 100 * SCALE)];
        let results = evaluate_positions(&positions, 90 * SCALE, 500);
        assert!(!results[0].is_liquidated);
    }
}
