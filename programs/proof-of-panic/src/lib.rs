/// Proof of Panic — On-chain program
/// A ZK-verified adversarial risk engine for Solana perpetual protocols.
///
/// This program:
/// - Stores protocol state (positions, risk config, insurance fund)
/// - Accepts ZK proofs of off-chain stress-test simulations
/// - Verifies proofs via CPI to a Sunspot verifier program
/// - Activates a circuit breaker when risk thresholds are exceeded

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("9YGU7h7TCskUQ2BkZfSVCkb66NzJPES5m5QrW8vUw6hE");

#[program]
pub mod proof_of_panic {
    use super::*;

    /// Initialize the protocol with default parameters.
    /// Creates GlobalState, RiskConfig, and PositionBook accounts.
    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Populate the PositionBook with demo positions.
    /// Creates 5 deterministic positions with varying leverage for the stress test.
    pub fn initialize_positions(ctx: Context<InitializePositions>) -> Result<()> {
        instructions::init_positions::handler(ctx)
    }

    /// Initialize the scalable position registry.
    pub fn initialize_position_registry(ctx: Context<InitPositionRegistry>) -> Result<()> {
        instructions::init_position_registry::handler(ctx)
    }

    /// Initialize incentives and reward vault.
    pub fn initialize_incentives(
        ctx: Context<InitIncentives>,
        reward_lamports: u64,
        min_proof_interval_slots: u64,
        enabled: bool,
    ) -> Result<()> {
        instructions::init_incentives::handler(
            ctx,
            reward_lamports,
            min_proof_interval_slots,
            enabled,
        )
    }

    /// Update incentives configuration.
    pub fn update_incentives(
        ctx: Context<UpdateIncentives>,
        reward_lamports: Option<u64>,
        min_proof_interval_slots: Option<u64>,
        enabled: Option<bool>,
    ) -> Result<()> {
        instructions::update_incentives::handler(
            ctx,
            reward_lamports,
            min_proof_interval_slots,
            enabled,
        )
    }

    /// Fund reward vault with lamports.
    pub fn fund_reward_vault(ctx: Context<FundRewardVault>, amount: u64) -> Result<()> {
        instructions::fund_reward_vault::handler(ctx, amount)
    }

    /// Create or update a per-position account.
    pub fn upsert_position(
        ctx: Context<UpsertPosition>,
        position_id: u64,
        collateral: u64,
        size: u64,
        entry_price: u64,
        is_long: bool,
        is_open: bool,
    ) -> Result<()> {
        instructions::upsert_position::handler(
            ctx,
            position_id,
            collateral,
            size,
            entry_price,
            is_long,
            is_open,
        )
    }

    /// Update the committed position root (for compressed state workflows).
    pub fn update_position_root(
        ctx: Context<UpdatePositionRoot>,
        position_root: [u8; 32],
        position_count: u64,
    ) -> Result<()> {
        instructions::update_position_root::handler(ctx, position_root, position_count)
    }

    /// Submit a ZK proof of a stress-test simulation and verify it.
    /// If verified and risk threshold exceeded, activates the circuit breaker.
    pub fn submit_proof_and_verify(
        ctx: Context<SubmitProofAndVerify>,
        proof_bytes: Vec<u8>,
        public_values_bytes: Vec<u8>,
        expected_shock_direction_up: bool,
    ) -> Result<()> {
        instructions::submit_proof::handler(
            ctx,
            proof_bytes,
            public_values_bytes,
            expected_shock_direction_up,
        )
    }

    /// Refresh the stored oracle price from a Pyth feed.
    pub fn refresh_oracle_price(ctx: Context<RefreshOraclePrice>) -> Result<()> {
        instructions::refresh_oracle::handler(ctx)
    }

    /// Update risk parameters or reset the circuit breaker.
    /// Admin-only instruction for demo replay.
    pub fn update_risk_params(
        ctx: Context<UpdateRiskParams>,
        new_max_leverage: Option<u64>,
        new_maintenance_margin_bps: Option<u64>,
        new_liquidation_target_margin_bps: Option<u64>,
        new_governance_timelock_slots: Option<u64>,
        new_circuit_breaker_threshold: Option<u64>,
        reset_circuit_breaker: bool,
    ) -> Result<()> {
        instructions::update_risk::handler(
            ctx,
            new_max_leverage,
            new_maintenance_margin_bps,
            new_liquidation_target_margin_bps,
            new_governance_timelock_slots,
            new_circuit_breaker_threshold,
            reset_circuit_breaker,
        )
    }
}
