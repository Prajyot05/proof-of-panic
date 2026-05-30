use anchor_lang::prelude::*;

#[error_code]
pub enum PanicError {
    #[msg("Unauthorized: signer is not the protocol authority")]
    Unauthorized,

    #[msg("Position book is already initialized with positions")]
    PositionsAlreadyInitialized,

    #[msg("State hash mismatch: proof does not correspond to current on-chain state")]
    StateHashMismatch,

    #[msg("Proof verification failed")]
    ProofVerificationFailed,

    #[msg("Circuit breaker is already active")]
    CircuitBreakerAlreadyActive,

    #[msg("Global risk parameter exceeds bounds")]
    InvalidRiskParam,

    #[msg("Arithmetic overflow in computation")]
    ArithmeticOverflow,

    #[msg("Proof is too stale: exceeds maximum age in slots")]
    ProofTooStale,

    #[msg("Proof is too old to be submitted")]
    ProofTooOld,

    #[msg("Invalid verifier program: does not match expected Sunspot verifier ID")]
    InvalidVerifierProgram,

    #[msg("Circuit breaker reset timelock has not expired")]
    TimelockNotExpired,

    #[msg("Invalid or stale oracle price")]
    InvalidOracle,
}
