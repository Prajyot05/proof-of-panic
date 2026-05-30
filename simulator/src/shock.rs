//! Market shock application.
//!
//! Applies a deterministic percentage drop to the oracle price.
//! No stochastic modeling, no Monte Carlo — just a single multiplication.

use crate::types::BPS_DENOMINATOR;

/// Apply a basis-points shock to a price.
///
/// For a 30% drop: shock_bps = 3000
/// $150.00 (150_000_000) → $105.00 (105_000_000)
pub fn apply_shock(price: u64, shock_bps: u64) -> u64 {
    // price * (10000 - shock_bps) / 10000
    let remaining_bps = BPS_DENOMINATOR.saturating_sub(shock_bps);
    price
        .checked_mul(remaining_bps)
        .expect("Price * remaining_bps overflow")
        / BPS_DENOMINATOR
}

/// Apply a basis-points upward shock to a price.
pub fn apply_shock_up(price: u64, shock_bps: u64) -> u64 {
    let multiplier = BPS_DENOMINATOR.saturating_add(shock_bps);
    price
        .checked_mul(multiplier)
        .expect("Price * multiplier overflow")
        / BPS_DENOMINATOR
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SCALE;

    #[test]
    fn test_30_percent_shock() {
        let price = 150 * SCALE; // $150.00
        let shocked = apply_shock(price, 3000);
        assert_eq!(shocked, 105 * SCALE); // $105.00
    }

    #[test]
    fn test_zero_shock() {
        let price = 150 * SCALE;
        let shocked = apply_shock(price, 0);
        assert_eq!(shocked, price);
    }

    #[test]
    fn test_100_percent_shock() {
        let price = 150 * SCALE;
        let shocked = apply_shock(price, 10000);
        assert_eq!(shocked, 0);
    }

    #[test]
    fn test_50_percent_shock() {
        let price = 200 * SCALE;
        let shocked = apply_shock(price, 5000);
        assert_eq!(shocked, 100 * SCALE);
    }
}
