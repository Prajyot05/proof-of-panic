use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::*;

/// Initialize the protocol with default parameters.
/// Creates GlobalState, RiskConfig, and PositionBook accounts.
pub fn handler(ctx: Context<InitializeProtocol>) -> Result<()> {
    // ── GlobalState ──
    let global_state = &mut ctx.accounts.global_state;
    global_state.authority = ctx.accounts.authority.key();
    global_state.oracle_price = DEFAULT_ORACLE_PRICE;
    global_state.total_positions = 0;
    global_state.insurance_fund = DEFAULT_INSURANCE_FUND;
    global_state.circuit_breaker_active = false;
    global_state.last_proof_slot = 0;
    global_state.last_state_hash = [0u8; 32];
    global_state.last_risk_score = 0;
    global_state.max_leverage = DEFAULT_MAX_LEVERAGE;
    global_state.bump = ctx.bumps.global_state;

    // ── RiskConfig ──
    let risk_config = &mut ctx.accounts.risk_config;
    risk_config.maintenance_margin_bps = DEFAULT_MAINTENANCE_MARGIN_BPS;
    risk_config.liquidation_fee_bps = DEFAULT_LIQUIDATION_FEE_BPS;
    risk_config.max_leverage = DEFAULT_MAX_LEVERAGE;
    risk_config.insurance_fund_target = DEFAULT_INSURANCE_FUND;
    risk_config.circuit_breaker_threshold = DEFAULT_CB_THRESHOLD;
    risk_config.shock_magnitude_bps = DEFAULT_SHOCK_BPS;
    risk_config.bump = ctx.bumps.risk_config;

    // ── PositionBook ──
    // Zero-copy account is initialized with all zeros by the `zero` constraint.
    // No additional initialization needed.

    msg!("✓ Protocol initialized | Price: ${} | Insurance: ${} | Max Leverage: {}x",
        global_state.oracle_price / SCALE,
        global_state.insurance_fund / SCALE,
        global_state.max_leverage / SCALE,
    );

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = GlobalState::SIZE,
        seeds = [GLOBAL_STATE_SEED],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = authority,
        space = RiskConfig::SIZE,
        seeds = [RISK_CONFIG_SEED],
        bump,
    )]
    pub risk_config: Account<'info, RiskConfig>,

    /// The PositionBook uses zero-copy layout.
    /// We create the account externally (client-side) and use `zero` to
    /// verify it's freshly initialized with the correct discriminator.
    #[account(
        init,
        payer = authority,
        space = PositionBook::SIZE,
        seeds = [POSITION_BOOK_SEED],
        bump,
    )]
    pub position_book: AccountLoader<'info, PositionBook>,

    pub system_program: Program<'info, System>,
}
