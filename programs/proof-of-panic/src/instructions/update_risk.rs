use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

/// Update risk parameters or reset the circuit breaker for demo replay.
pub fn handler(
    ctx: Context<UpdateRiskParams>,
    new_max_leverage: Option<u64>,
    new_maintenance_margin_bps: Option<u64>,
    new_circuit_breaker_threshold: Option<u64>,
    reset_circuit_breaker: bool,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let risk_config = &mut ctx.accounts.risk_config;

    require!(
        global_state.authority == ctx.accounts.authority.key(),
        PanicError::Unauthorized
    );

    if let Some(leverage) = new_max_leverage {
        require!(leverage > 0 && leverage <= 100 * SCALE, PanicError::InvalidRiskParam);
        global_state.max_leverage = leverage;
        risk_config.max_leverage = leverage;
        msg!("Max leverage updated to {}x", leverage / SCALE);
    }

    if let Some(margin) = new_maintenance_margin_bps {
        require!(margin > 0 && margin <= BPS_DENOMINATOR, PanicError::InvalidRiskParam);
        risk_config.maintenance_margin_bps = margin;
        msg!("Maintenance margin updated to {} bps", margin);
    }

    if let Some(threshold) = new_circuit_breaker_threshold {
        require!(threshold <= RISK_SCORE_MAX, PanicError::InvalidRiskParam);
        risk_config.circuit_breaker_threshold = threshold;
        msg!("Circuit breaker threshold updated to {}", threshold);
    }

    if reset_circuit_breaker {
        let clock = Clock::get()?;
        require!(
            clock.slot >= global_state.circuit_breaker_activation_slot + CB_RESET_TIMELOCK_SLOTS,
            PanicError::TimelockNotExpired
        );

        global_state.circuit_breaker_active = false;
        global_state.max_leverage = DEFAULT_MAX_LEVERAGE;
        global_state.last_risk_score = 0;
        global_state.insurance_fund = DEFAULT_INSURANCE_FUND;
        msg!("✓ Circuit breaker reset | Protocol restored to default state");
    }

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRiskParams<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [RISK_CONFIG_SEED],
        bump = risk_config.bump,
    )]
    pub risk_config: Account<'info, RiskConfig>,
}
