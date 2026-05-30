use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

/// Update the committed root for all position accounts.
pub fn handler(
    ctx: Context<UpdatePositionRoot>,
    position_root: [u8; 32],
    position_count: u64,
) -> Result<()> {
    let registry = &mut ctx.accounts.position_registry;
    let clock = Clock::get()?;

    require!(
        registry.authority == ctx.accounts.authority.key(),
        PanicError::Unauthorized
    );

    registry.position_root = position_root;
    registry.position_count = position_count;
    registry.last_root_slot = clock.slot;

    msg!("✓ Position root updated ({} positions)", position_count);
    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePositionRoot<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [POSITION_REGISTRY_SEED],
        bump = position_registry.bump,
    )]
    pub position_registry: Account<'info, PositionRegistry>,
}
