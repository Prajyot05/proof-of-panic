use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::*;

/// Initialize the position registry for scalable position commitments.
pub fn handler(ctx: Context<InitPositionRegistry>) -> Result<()> {
    let registry = &mut ctx.accounts.position_registry;
    registry.authority = ctx.accounts.authority.key();
    registry.position_root = [0u8; 32];
    registry.position_count = 0;
    registry.last_root_slot = 0;
    registry.bump = ctx.bumps.position_registry;

    msg!("✓ Position registry initialized");
    Ok(())
}

#[derive(Accounts)]
pub struct InitPositionRegistry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = PositionRegistry::SIZE,
        seeds = [POSITION_REGISTRY_SEED],
        bump,
    )]
    pub position_registry: Account<'info, PositionRegistry>,

    pub system_program: Program<'info, System>,
}
