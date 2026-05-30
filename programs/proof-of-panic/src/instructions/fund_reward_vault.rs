use anchor_lang::prelude::*;

use crate::constants::*;

/// Fund the reward vault with lamports.
pub fn handler(ctx: Context<FundRewardVault>, amount: u64) -> Result<()> {
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.funder.key(),
        &ctx.accounts.reward_vault.key(),
        amount,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.funder.to_account_info(),
            ctx.accounts.reward_vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    msg!("✓ Reward vault funded: {} lamports", amount);
    Ok(())
}

#[derive(Accounts)]
pub struct FundRewardVault<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,

    #[account(
        mut,
        seeds = [REWARD_VAULT_SEED],
        bump,
    )]
    pub reward_vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
