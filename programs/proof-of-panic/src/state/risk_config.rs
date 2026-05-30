use anchor_lang::prelude::*;

/// Protocol risk configuration parameters.
/// Separated from GlobalState for clean account separation
/// and independent updateability.
///
/// PDA: seeds = [b"risk_config"]
/// Layout: Standard Borsh (~60 bytes)
#[account]
#[derive(Default)]
pub struct RiskConfig {
    /// Maintenance margin in basis points (e.g., 500 = 5%)
    pub maintenance_margin_bps: u64,

    /// Liquidation fee in basis points (e.g., 250 = 2.5%)
    pub liquidation_fee_bps: u64,

    /// Target margin after partial liquidation in basis points
    pub liquidation_target_margin_bps: u64,

    /// Maximum leverage allowed (in micros, e.g., 10_000_000 = 10x)
    pub max_leverage: u64,

    /// Target insurance fund size in microdollars
    pub insurance_fund_target: u64,

    /// Risk score above which circuit breaker activates (0 to 1,000,000)
    pub circuit_breaker_threshold: u64,

    /// Shock magnitude to simulate in basis points (e.g., 3000 = 30%)
    pub shock_magnitude_bps: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl RiskConfig {
    pub const SIZE: usize = 8  // discriminator
        + 8   // maintenance_margin_bps
        + 8   // liquidation_fee_bps
        + 8   // liquidation_target_margin_bps
        + 8   // max_leverage
        + 8   // insurance_fund_target
        + 8   // circuit_breaker_threshold
        + 8   // shock_magnitude_bps
        + 1;  // bump
}
