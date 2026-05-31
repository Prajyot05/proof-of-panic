use panic_simulator::liquidation::evaluate_positions;
use panic_simulator::types::*;
use proptest::prelude::*;

// Define proptest strategies for types
prop_compose! {
    fn arbitrary_position()(
        collateral in 0..10_000_000u64,
        size in 0..100_000_000u64,
        entry_price in 1..200_000_000u64,
        is_long in any::<bool>(),
        is_open in any::<bool>()
    ) -> SimPosition {
        SimPosition {
            owner: "00".repeat(32),
            collateral,
            size,
            entry_price,
            is_long,
            is_open,
        }
    }
}

prop_compose! {
    fn arbitrary_risk_config()(
        maintenance_margin_bps in 100..2000u64, // 1% to 20%
        liquidation_fee_bps in 0..500u64, // 0% to 5%
        liquidation_target_margin_bps in 200..3000u64, // 2% to 30%
        circuit_breaker_threshold in 100_000..900_000u64,
        shock_magnitude_bps in 0..9000u64
    ) -> SimRiskConfig {
        SimRiskConfig {
            maintenance_margin_bps,
            liquidation_fee_bps,
            liquidation_target_margin_bps: std::cmp::max(maintenance_margin_bps, liquidation_target_margin_bps),
            circuit_breaker_threshold,
            shock_magnitude_bps,
        }
    }
}

proptest! {
    #[test]
    fn test_liquidation_invariants(
        mut positions in prop::collection::vec(arbitrary_position(), 1..8),
        risk_config in arbitrary_risk_config(),
        current_price in 1..200_000_000u64
    ) {
        // Run the evaluation
        let result = evaluate_positions(&mut positions, current_price, &risk_config);

        // Assert invariants
        if let Ok((results, final_price)) = result {
            // 1. Price never increases due to liquidations in our model
            prop_assert!(final_price <= current_price);

            // 2. Liquidated size is never negative and never exceeds position size
            for i in 0..positions.len() {
                prop_assert!(results[i].liquidated_size <= positions[i].size || positions[i].size == 0); // Position size after liquidation could be 0, wait, it's original size
            }
        }
    }
}
