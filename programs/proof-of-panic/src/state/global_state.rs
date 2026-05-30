use anchor_lang::prelude::*;

/// Singleton protocol-level state.
/// Tracks overall protocol health, circuit breaker status,
/// and the latest verified state commitment.
///
/// PDA: seeds = [b"global_state"]
/// Layout: Standard Borsh (small account, ~120 bytes)
#[account]
#[derive(Default)]
pub struct GlobalState {
    /// Protocol admin authority (demo keypair)
    pub authority: Pubkey,

    /// Current SOL price in microdollars (e.g., 150_000_000 = $150.00)
    pub oracle_price: u64,

    /// Number of active positions in the PositionBook
    pub total_positions: u8,

    /// Insurance fund balance in microdollars
    pub insurance_fund: u64,

    /// True if the circuit breaker has been triggered
    pub circuit_breaker_active: bool,

    /// Slot at which the last proof was successfully verified
    pub last_proof_slot: u64,

    /// SHA-256 hash of the position array at the time of proof
    pub last_state_hash: [u8; 32],

    /// SHA-256 hash of the last public values payload
    pub last_public_values_hash: [u8; 32],

    /// Schema version of the last accepted proof
    pub last_proof_schema_version: u32,

    /// Risk score from the last verified simulation (0 to 1,000,000)
    pub last_risk_score: u64,

    /// Last proof submitter
    pub last_submitter: Pubkey,

    /// Last reward paid in lamports
    pub last_reward_lamports: u64,

    /// Slot when risk parameters were last updated
    pub last_risk_update_slot: u64,

    /// Governance timelock for risk updates
    pub governance_timelock_slots: u64,

    /// Current maximum allowed leverage (in micros, e.g., 10_000_000 = 10x)
    pub max_leverage: u64,

    /// Slot when circuit breaker was activated (for reset timelock)
    pub circuit_breaker_activation_slot: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl GlobalState {
    /// Account discriminator (8) + all fields
    pub const SIZE: usize = 8  // discriminator
        + 32  // authority
        + 8   // oracle_price
        + 1   // total_positions
        + 8   // insurance_fund
        + 1   // circuit_breaker_active
        + 8   // last_proof_slot
        + 32  // last_state_hash
        + 32  // last_public_values_hash
        + 4   // last_proof_schema_version
        + 8   // last_risk_score
        + 32  // last_submitter
        + 8   // last_reward_lamports
        + 8   // last_risk_update_slot
        + 8   // governance_timelock_slots
        + 8   // max_leverage
        + 8   // circuit_breaker_activation_slot
        + 1;  // bump
}
