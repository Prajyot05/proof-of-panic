//! Pre-built adversarial scenarios for stress testing.
//!
//! Each scenario defines a set of positions, a shock magnitude, and
//! risk parameters. This lets us demonstrate the system's behavior
//! across a range of market conditions — not just one hardcoded crash.

use crate::types::*;

/// A complete scenario definition for the simulator.
#[derive(Debug, Clone)]
pub struct Scenario {
    /// Human-readable name
    pub name: &'static str,

    /// Short description for display
    pub description: &'static str,

    /// Oracle price before shock (microdollars)
    pub oracle_price: u64,

    /// Insurance fund balance (microdollars)
    pub insurance_fund: u64,

    /// Shock magnitude in basis points
    pub shock_bps: u64,

    /// Risk configuration
    pub risk_config: SimRiskConfig,

    /// Positions to simulate
    pub positions: Vec<SimPosition>,
}

/// Deterministic owner generation matching on-chain logic.
fn owner_hex(seed: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

fn default_risk_config(shock_bps: u64) -> SimRiskConfig {
    SimRiskConfig {
        maintenance_margin_bps: 500,
        liquidation_fee_bps: 250,
        circuit_breaker_threshold: 700_000,
        shock_magnitude_bps: shock_bps,
    }
}

/// The 5 standard demo positions (matching on-chain init_positions.rs)
fn standard_positions() -> Vec<SimPosition> {
    vec![
        // Position 0: LONG 10x, $10,000 @ $150 — HEALTHY
        SimPosition {
            owner: owner_hex("trader_alice"),
            collateral: 10_000 * SCALE,
            size: 100_000 * SCALE,
            entry_price: 150 * SCALE,
            is_long: true,
            is_open: true,
        },
        // Position 1: LONG 15x, $5,000 @ $155 — MARGINAL
        SimPosition {
            owner: owner_hex("trader_bob"),
            collateral: 5_000 * SCALE,
            size: 75_000 * SCALE,
            entry_price: 155 * SCALE,
            is_long: true,
            is_open: true,
        },
        // Position 2: LONG 20x, $3,000 @ $160 — DANGEROUS
        SimPosition {
            owner: owner_hex("trader_charlie"),
            collateral: 3_000 * SCALE,
            size: 60_000 * SCALE,
            entry_price: 160 * SCALE,
            is_long: true,
            is_open: true,
        },
        // Position 3: SHORT 5x, $8,000 @ $145 — SAFE (benefits from drop)
        SimPosition {
            owner: owner_hex("trader_diana"),
            collateral: 8_000 * SCALE,
            size: 40_000 * SCALE,
            entry_price: 145 * SCALE,
            is_long: false,
            is_open: true,
        },
        // Position 4: LONG 25x, $2,000 @ $158 — EXTREME RISK
        SimPosition {
            owner: owner_hex("trader_eve"),
            collateral: 2_000 * SCALE,
            size: 50_000 * SCALE,
            entry_price: 158 * SCALE,
            is_long: true,
            is_open: true,
        },
    ]
}

/// High-leverage positions for the cascading leverage scenario.
fn high_leverage_positions() -> Vec<SimPosition> {
    vec![
        SimPosition {
            owner: owner_hex("whale_alpha"),
            collateral: 8_000 * SCALE,
            size: 120_000 * SCALE, // 15x
            entry_price: 150 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_beta"),
            collateral: 5_000 * SCALE,
            size: 100_000 * SCALE, // 20x
            entry_price: 152 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_gamma"),
            collateral: 4_000 * SCALE,
            size: 80_000 * SCALE, // 20x
            entry_price: 148 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_delta"),
            collateral: 3_000 * SCALE,
            size: 75_000 * SCALE, // 25x
            entry_price: 155 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_epsilon"),
            collateral: 2_000 * SCALE,
            size: 50_000 * SCALE, // 25x
            entry_price: 158 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_zeta"),
            collateral: 6_000 * SCALE,
            size: 90_000 * SCALE, // 15x
            entry_price: 147 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_eta"),
            collateral: 3_500 * SCALE,
            size: 70_000 * SCALE, // 20x
            entry_price: 153 * SCALE,
            is_long: true,
            is_open: true,
        },
        SimPosition {
            owner: owner_hex("whale_theta"),
            collateral: 1_500 * SCALE,
            size: 37_500 * SCALE, // 25x
            entry_price: 160 * SCALE,
            is_long: true,
            is_open: true,
        },
    ]
}

/// Get a built-in scenario by name.
pub fn get_scenario(name: &str) -> Option<Scenario> {
    match name {
        "volatility-shock" => Some(Scenario {
            name: "Volatility Shock",
            description: "SOL drops 30%. Cascading liquidations deplete insurance. Circuit breaker fires.",
            oracle_price: 150 * SCALE,
            insurance_fund: 50_000 * SCALE,
            shock_bps: 3000,
            risk_config: default_risk_config(3000),
            positions: standard_positions(),
        }),
        "mild-correction" => Some(Scenario {
            name: "Mild Correction",
            description: "SOL drops 10%. Only extreme leverage is liquidated. Protocol survives.",
            oracle_price: 150 * SCALE,
            insurance_fund: 50_000 * SCALE,
            shock_bps: 1000,
            risk_config: default_risk_config(1000),
            positions: standard_positions(),
        }),
        "flash-crash" => Some(Scenario {
            name: "Flash Crash",
            description: "SOL drops 50%. Near-total wipeout. Catastrophic insolvency.",
            oracle_price: 150 * SCALE,
            insurance_fund: 50_000 * SCALE,
            shock_bps: 5000,
            risk_config: default_risk_config(5000),
            positions: standard_positions(),
        }),
        "short-squeeze" => Some(Scenario {
            name: "Short Squeeze",
            description: "SOL rises 40%. Short positions get crushed. Longs profit.",
            oracle_price: 150 * SCALE,
            insurance_fund: 50_000 * SCALE,
            shock_bps: 4000, // This will be applied as a RISE, not a drop
            risk_config: default_risk_config(4000),
            positions: standard_positions(),
        }),
        "cascading-leverage" => Some(Scenario {
            name: "Cascading Leverage",
            description: "SOL drops 30%. 8 high-leverage longs. Total wipeout. Maximum bad debt.",
            oracle_price: 150 * SCALE,
            insurance_fund: 50_000 * SCALE,
            shock_bps: 3000,
            risk_config: default_risk_config(3000),
            positions: high_leverage_positions(),
        }),
        _ => None,
    }
}

/// List all available scenario names.
pub fn list_scenarios() -> Vec<&'static str> {
    vec![
        "volatility-shock",
        "mild-correction",
        "flash-crash",
        "short-squeeze",
        "cascading-leverage",
    ]
}

/// Convert a Scenario into a Snapshot for the existing pipeline.
pub fn scenario_to_snapshot(scenario: &Scenario) -> Snapshot {
    Snapshot {
        oracle_price: scenario.oracle_price,
        insurance_fund: scenario.insurance_fund,
        positions: scenario.positions.clone(),
        risk_config: scenario.risk_config.clone(),
    }
}
