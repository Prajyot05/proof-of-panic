use anchor_lang::prelude::*;
use anchor_lang::solana_program;

/// Seeds for PDA derivation
pub const GLOBAL_STATE_SEED: &[u8] = b"global_state";
pub const RISK_CONFIG_SEED: &[u8] = b"risk_config";
pub const POSITION_BOOK_SEED: &[u8] = b"position_book";
pub const POSITION_REGISTRY_SEED: &[u8] = b"position_registry";
pub const POSITION_ACCOUNT_SEED: &[u8] = b"position_account";
pub const INCENTIVES_CONFIG_SEED: &[u8] = b"incentives_config";
pub const REWARD_VAULT_SEED: &[u8] = b"reward_vault";

/// Maximum number of positions in the PositionBook.
/// Fixed at 8 for the demo — keeps the SP1 zkVM execution at a manageable size.
pub const MAX_POSITIONS: usize = 8;

/// Scale factor for all monetary values.
/// All prices, collateral, and PnL values are in microdollars (10^6).
/// $150.00 = 150_000_000
pub const SCALE: u64 = 1_000_000;

/// Basis points denominator
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Risk score range: 0 to RISK_SCORE_MAX (1,000,000 = 100%)
pub const RISK_SCORE_MAX: u64 = 1_000_000;

/// Public values schema version for proof binding
pub const PROOF_SCHEMA_VERSION: u32 = 1;

// ── Default protocol parameters ──

/// Default oracle price: $150.00
pub const DEFAULT_ORACLE_PRICE: u64 = 150 * SCALE;

/// Default insurance fund: $50,000.00
pub const DEFAULT_INSURANCE_FUND: u64 = 50_000 * SCALE;

/// Default max leverage: 10x (stored as 10 * SCALE)
pub const DEFAULT_MAX_LEVERAGE: u64 = 10 * SCALE;

/// Default maintenance margin: 5% (500 bps)
pub const DEFAULT_MAINTENANCE_MARGIN_BPS: u64 = 500;

/// Default liquidation fee: 2.5% (250 bps)
pub const DEFAULT_LIQUIDATION_FEE_BPS: u64 = 250;

/// Default liquidation target margin: 8% (800 bps)
pub const DEFAULT_LIQUIDATION_TARGET_MARGIN_BPS: u64 = 800;

/// Default circuit breaker threshold: 70% risk (700,000 / 1,000,000)
pub const DEFAULT_CB_THRESHOLD: u64 = 700_000;

/// Default shock magnitude: 30% (3000 bps)
pub const DEFAULT_SHOCK_BPS: u64 = 3_000;

/// Leverage reduction factor when circuit breaker activates (50% reduction)
pub const CB_LEVERAGE_REDUCTION_BPS: u64 = 5_000;

/// Sunspot verifier program ID.
/// This MUST match the deployed Sunspot-generated verifier for the panic_proof circuit.
/// Update this after running `sunspot deploy`.
/// The current value is a placeholder — replace with the actual deployed verifier program ID.
pub const SUNSPOT_VERIFIER_PROGRAM_ID: Pubkey = Pubkey::new_from_array([0; 32]);

/// Maximum proof age in slots (~1 minute at 400ms/slot)
pub const MAX_PROOF_AGE_SLOTS: u64 = 150;

/// Circuit breaker reset timelock in slots (~10 minutes at 400ms/slot)
pub const CB_RESET_TIMELOCK_SLOTS: u64 = 1500;

/// Default governance timelock for risk updates (~5 minutes at 400ms/slot)
pub const DEFAULT_GOVERNANCE_TIMELOCK_SLOTS: u64 = 750;

/// Default proof reward in lamports (0.002 SOL)
pub const DEFAULT_PROOF_REWARD_LAMPORTS: u64 = 2_000_000;

/// Minimum slots between rewarded proofs
pub const DEFAULT_MIN_PROOF_INTERVAL_SLOTS: u64 = 5;
