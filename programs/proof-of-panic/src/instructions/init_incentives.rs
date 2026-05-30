use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::*;
use crate::state::*;

/// Initialize incentives config and reward vault.
pub fn handler(
    ctx: Context<InitIncentives>,
    reward_lamports: u64,
    min_proof_interval_slots: u64,
    enabled: bool,
) -> Result<()> {
    let incentives = &mut ctx.accounts.incentives_config;

    incentives.authority = ctx.accounts.authority.key();
    incentives.reward_lamports = reward_lamports;
    incentives.min_proof_interval_slots = min_proof_interval_slots;
    incentives.enabled = enabled;
    incentives.reward_vault_bump = ctx.bumps.reward_vault;
    incentives.bump = ctx.bumps.incentives_config;

    msg!("✓ Incentives initialized");
    Ok(())
}

#[derive(Accounts)]
pub struct InitIncentives<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = IncentivesConfig::SIZE,
        seeds = [INCENTIVES_CONFIG_SEED],
        bump,
    )]
    pub incentives_config: Account<'info, IncentivesConfig>,

    #[account(
        seeds = [REWARD_VAULT_SEED],
        bump,
    )]
    /// CHECK: System account owned by system program
    pub reward_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
