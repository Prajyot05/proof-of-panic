//! Shared types for the Proof of Panic simulator.
//!
//! These types mirror the on-chain account structures but are designed
//! for off-chain use with serde serialization.
//!
//! CRITICAL: The `canonical_bytes()` serialization MUST produce identical
//! bytes to the on-chain `PositionBook::canonical_bytes()` and the SP1 zkVM
//! circuit's hash input. Any discrepancy will cause state hash mismatch.

use serde::{Deserialize, Serialize};

/// Scale factor: all monetary values are in microdollars (10^6)
pub const SCALE: u64 = 1_000_000;

/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Maximum risk score
pub const RISK_SCORE_MAX: u64 = 1_000_000;

/// Maximum positions (must match on-chain MAX_POSITIONS)
pub const MAX_POSITIONS: usize = 8;

/// Position size in bytes (must match on-chain Position layout)
pub const POSITION_BYTE_SIZE: usize = 64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimPosition {
    /// Owner pubkey as hex string
    pub owner: String,

    /// Collateral in microdollars
    pub collateral: u64,

    /// Notional size in microdollars
    pub size: u64,

    /// Entry price in microdollars
    pub entry_price: u64,

    /// True if long, false if short
    pub is_long: bool,

    /// True if position is open
    pub is_open: bool,
}

impl SimPosition {
    /// Serialize to canonical bytes matching the on-chain #[repr(C)] layout.
    ///
    /// Layout: owner(32) | collateral(8 LE) | size(8 LE) | entry_price(8 LE) |
    ///         is_long(1) | is_open(1) | padding(6)
    pub fn canonical_bytes(&self) -> [u8; POSITION_BYTE_SIZE] {
        let mut bytes = [0u8; POSITION_BYTE_SIZE];

        // Owner: 32 bytes from hex string
        let owner_bytes = hex::decode(&self.owner).unwrap_or_else(|_| vec![0u8; 32]);
        let len = owner_bytes.len().min(32);
        bytes[0..len].copy_from_slice(&owner_bytes[..len]);

        // Collateral: 8 bytes LE
        bytes[32..40].copy_from_slice(&self.collateral.to_le_bytes());

        // Size: 8 bytes LE
        bytes[40..48].copy_from_slice(&self.size.to_le_bytes());

        // Entry price: 8 bytes LE
        bytes[48..56].copy_from_slice(&self.entry_price.to_le_bytes());

        // is_long: 1 byte
        bytes[56] = if self.is_long { 1 } else { 0 };

        // is_open: 1 byte
        bytes[57] = if self.is_open { 1 } else { 0 };

        // padding: bytes[58..64] already zero

        bytes
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimRiskConfig {
    /// Maintenance margin in basis points
    pub maintenance_margin_bps: u64,

    /// Liquidation fee in basis points
    pub liquidation_fee_bps: u64,

    /// Target margin after partial liquidation in basis points
    pub liquidation_target_margin_bps: u64,

    /// Circuit breaker threshold (0 to 1,000,000)
    pub circuit_breaker_threshold: u64,

    /// Shock magnitude in basis points
    pub shock_magnitude_bps: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    /// Current oracle price in microdollars
    pub oracle_price: u64,

    /// Insurance fund balance in microdollars
    pub insurance_fund: u64,

    /// Active positions
    pub positions: Vec<SimPosition>,

    /// Risk configuration
    pub risk_config: SimRiskConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionResult {
    /// Position index
    pub index: usize,

    /// Unrealized PnL in microdollars (signed)
    pub unrealized_pnl: i64,

    /// Margin ratio in basis points
    pub margin_ratio_bps: u64,

    /// Whether this position was liquidated
    pub is_liquidated: bool,

    /// Loss amount if liquidated (absorbed by insurance or becomes bad debt)
    pub liquidation_loss: u64,

    /// Fees collected from liquidation
    pub liquidation_fee_paid: u64,

    /// Size liquidated from the position
    pub liquidated_size: u64,

    /// Effective collateral after PnL
    pub effective_collateral: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimResult {
    /// Price before shock
    pub pre_shock_price: u64,

    /// Price after shock
    pub post_shock_price: u64,

    /// Shock magnitude in basis points
    pub shock_bps: u64,

    /// True if the shock is a price increase (short squeeze)
    pub shock_direction_up: bool,

    /// Results for each position
    pub position_results: Vec<PositionResult>,

    /// Number of liquidated positions
    pub num_liquidated: u64,

    /// Total liquidation losses
    pub total_losses: u64,

    /// Total liquidation fees collected
    pub total_fees_collected: u64,

    /// Insurance fund balance after absorbing losses
    pub insurance_fund_remaining: u64,

    /// Bad debt (losses exceeding insurance fund)
    pub total_bad_debt: u64,

    /// Risk score: 0 to 1,000,000
    pub risk_score: u64,

    /// Whether the protocol remains solvent
    pub protocol_solvent: bool,

    /// SHA-256 hash of the canonical position bytes
    pub state_hash: [u8; 32],
}
