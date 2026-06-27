#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use proof_of_panic::state::GlobalState;

declare_id!("3h1vsZgXrneHjj2hCp4sMgkFhLzNNFwdZAzoEr5oR6pF");

#[program]
pub mod target_perp {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, initial_leverage: u64) -> Result<()> {
        let state = &mut ctx.accounts.perp_state;
        state.authority = ctx.accounts.authority.key();
        state.max_leverage = initial_leverage;
        Ok(())
    }

    pub fn apply_circuit_breaker(ctx: Context<ApplyCircuitBreaker>) -> Result<()> {
        let risk_engine_state = &ctx.accounts.risk_engine_state;
        let perp_state = &mut ctx.accounts.perp_state;

        require!(
            risk_engine_state.circuit_breaker_active,
            TargetError::CircuitBreakerNotActive
        );

        // Reduce leverage to max(1x, current / 2)
        let new_leverage = (perp_state.max_leverage / 2).max(1_000_000);

        msg!("Proof of Panic Circuit Breaker triggered!");
        msg!(
            "Reducing max leverage from {}x to {}x",
            perp_state.max_leverage / 1_000_000,
            new_leverage / 1_000_000
        );

        perp_state.max_leverage = new_leverage;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8,
        seeds = [b"perp_state"],
        bump
    )]
    pub perp_state: Account<'info, PerpState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyCircuitBreaker<'info> {
    #[account(
        mut,
        seeds = [b"perp_state"],
        bump
    )]
    pub perp_state: Account<'info, PerpState>,

    #[account(
        seeds = [b"global_state"],
        bump,
        seeds::program = proof_of_panic::ID
    )]
    pub risk_engine_state: Account<'info, GlobalState>,
}

#[account]
pub struct PerpState {
    pub authority: Pubkey,
    pub max_leverage: u64, // Scaled by 1_000_000
}

#[error_code]
pub enum TargetError {
    #[msg("Risk engine circuit breaker is not active")]
    CircuitBreakerNotActive,
}
