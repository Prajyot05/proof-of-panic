use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

/// Update incentives configuration.
pub fn handler(
    ctx: Context<UpdateIncentives>,
    reward_lamports: Option<u64>,
    min_proof_interval_slots: Option<u64>,
    enabled: Option<bool>,
) -> Result<()> {
    let incentives = &mut ctx.accounts.incentives_config;

    require!(
        incentives.authority == ctx.accounts.authority.key(),
        PanicError::Unauthorized
    );

    if let Some(value) = reward_lamports {
        incentives.reward_lamports = value;
        msg!("Reward lamports updated to {}", value);
    }

    if let Some(value) = min_proof_interval_slots {
        incentives.min_proof_interval_slots = value;
        msg!("Min proof interval updated to {} slots", value);
    }

    if let Some(value) = enabled {
        incentives.enabled = value;
        msg!("Incentives enabled: {}", value);
    }

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateIncentives<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [INCENTIVES_CONFIG_SEED],
        bump = incentives_config.bump,
    )]
    pub incentives_config: Account<'info, IncentivesConfig>,
}
