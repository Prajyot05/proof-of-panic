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

    /// Submit a ZK proof of a stress-test simulation and verify it.
    /// If verified and risk threshold exceeded, activates the circuit breaker.
    pub fn submit_proof_and_verify(
        ctx: Context<SubmitProofAndVerify>,
        proof_bytes: Vec<u8>,
        public_values_bytes: Vec<u8>,
    ) -> Result<()> {
        instructions::submit_proof::handler(
            ctx,
            proof_bytes,
            public_values_bytes,
        )
    }

    /// Update risk parameters or reset the circuit breaker.
    /// Admin-only instruction for demo replay.
    pub fn update_risk_params(
        ctx: Context<UpdateRiskParams>,
        new_max_leverage: Option<u64>,
        new_maintenance_margin_bps: Option<u64>,
        new_circuit_breaker_threshold: Option<u64>,
        reset_circuit_breaker: bool,
    ) -> Result<()> {
        instructions::update_risk::handler(
            ctx,
            new_max_leverage,
            new_maintenance_margin_bps,
            new_circuit_breaker_threshold,
            reset_circuit_breaker,
        )
    }
}
