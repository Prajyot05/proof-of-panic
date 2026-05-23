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

    #[msg("Invalid risk parameter value")]
    InvalidRiskParam,

    #[msg("Arithmetic overflow in computation")]
    ArithmeticOverflow,
}
