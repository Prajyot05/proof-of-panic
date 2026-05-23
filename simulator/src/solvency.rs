//! Solvency computation — insurance fund depletion and bad debt calculation.

use crate::types::*;

/// Compute protocol solvency after liquidation cascade.
///
/// Returns: (insurance_fund_remaining, total_bad_debt, risk_score, protocol_solvent)
pub fn compute_solvency(
    position_results: &[PositionResult],
    insurance_fund: u64,
    positions: &[SimPosition],
) -> (u64, u64, u64, bool) {
    // Sum all liquidation losses (from underwater positions)
    let total_losses: u64 = position_results
        .iter()
        .map(|r| r.liquidation_loss)
        .sum();

    // Determine insurance fund usage and bad debt
    let (insurance_remaining, bad_debt) = if total_losses <= insurance_fund {
        (insurance_fund - total_losses, 0u64)
    } else {
        (0u64, total_losses - insurance_fund)
    };

    let protocol_solvent = bad_debt == 0;

    // Compute risk score: normalized measure of protocol stress
    // risk_score = min(1_000_000, bad_debt * 1_000_000 / total_collateral)
    //
    // If there's no bad debt but insurance was heavily depleted,
    // we still want a high risk score to signal danger.
    let total_collateral: u64 = positions
        .iter()
        .filter(|p| p.is_open)
        .map(|p| p.collateral)
        .sum();

    let risk_score = if total_collateral == 0 {
        if bad_debt > 0 {
            RISK_SCORE_MAX
        } else {
            0
        }
    } else if bad_debt > 0 {
        // Bad debt exists — risk score based on bad debt relative to total collateral
        let score = bad_debt as u128 * RISK_SCORE_MAX as u128 / total_collateral as u128;
        std::cmp::min(RISK_SCORE_MAX, score as u64)
    } else {
        // No bad debt — risk score based on insurance depletion
        // If insurance was 80% depleted, risk score = 800,000 * (1 - remaining/original)
        // This makes the circuit breaker trigger even before actual insolvency
        let depletion_ratio = if insurance_fund > 0 {
            (insurance_fund - insurance_remaining) as u128 * RISK_SCORE_MAX as u128
                / insurance_fund as u128
        } else {
            0
        };
        std::cmp::min(RISK_SCORE_MAX, depletion_ratio as u64)
    };

    (insurance_remaining, bad_debt, risk_score, protocol_solvent)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_no_losses_no_risk() {
        let results = vec![PositionResult {
            index: 0,
            unrealized_pnl: 1000,
            margin_ratio_bps: 5000,
            is_liquidated: false,
            liquidation_loss: 0,
            effective_collateral: 11000,
        }];
        let positions = vec![SimPosition {
            owner: "00".repeat(32),
            collateral: 10_000 * SCALE,
            size: 20_000 * SCALE,
            entry_price: 100 * SCALE,
            is_long: true,
            is_open: true,
        }];

        let (remaining, bad_debt, risk_score, solvent) =
            compute_solvency(&results, 50_000 * SCALE, &positions);
        assert_eq!(remaining, 50_000 * SCALE);
        assert_eq!(bad_debt, 0);
        assert_eq!(risk_score, 0);
        assert!(solvent);
    }

    #[test]
    fn test_losses_covered_by_insurance() {
        let results = vec![PositionResult {
            index: 0,
            unrealized_pnl: -30_000_000_000,
            margin_ratio_bps: 0,
            is_liquidated: true,
            liquidation_loss: 20_000 * SCALE, // $20k loss
            effective_collateral: -20_000_000_000,
        }];
        let positions = vec![SimPosition {
            owner: "00".repeat(32),
            collateral: 10_000 * SCALE,
            size: 100_000 * SCALE,
            entry_price: 100 * SCALE,
            is_long: true,
            is_open: true,
        }];

        let (remaining, bad_debt, _risk_score, solvent) =
            compute_solvency(&results, 50_000 * SCALE, &positions);
        assert_eq!(remaining, 30_000 * SCALE);
        assert_eq!(bad_debt, 0);
        assert!(solvent);
    }

    #[test]
    fn test_insolvency_bad_debt() {
        let results = vec![PositionResult {
            index: 0,
            unrealized_pnl: -80_000_000_000,
            margin_ratio_bps: 0,
            is_liquidated: true,
            liquidation_loss: 70_000 * SCALE, // $70k loss > $50k insurance
            effective_collateral: -70_000_000_000,
        }];
        let positions = vec![SimPosition {
            owner: "00".repeat(32),
            collateral: 10_000 * SCALE,
            size: 100_000 * SCALE,
            entry_price: 100 * SCALE,
            is_long: true,
            is_open: true,
        }];

        let (remaining, bad_debt, risk_score, solvent) =
            compute_solvency(&results, 50_000 * SCALE, &positions);
        assert_eq!(remaining, 0);
        assert_eq!(bad_debt, 20_000 * SCALE);
        assert!(!solvent);
        assert!(risk_score > 0);
    }
}
