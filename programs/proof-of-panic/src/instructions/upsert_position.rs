use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::*;

/// Create or update a per-position account.
pub fn handler(
    ctx: Context<UpsertPosition>,
    position_id: u64,
    collateral: u64,
    size: u64,
    entry_price: u64,
    is_long: bool,
    is_open: bool,
) -> Result<()> {
    let position = &mut ctx.accounts.position_account;

    position.owner = ctx.accounts.owner.key();
    position.position_id = position_id;
    position.collateral = collateral;
    position.size = size;
    position.entry_price = entry_price;
    position.is_long = u8::from(is_long);
    position.is_open = u8::from(is_open);
    position.bump = ctx.bumps.position_account;

    msg!(
        "✓ Position updated: owner={} id={}",
        position.owner,
        position_id
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(position_id: u64)]
pub struct UpsertPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = PositionAccount::SIZE,
        seeds = [POSITION_ACCOUNT_SEED, owner.key().as_ref(), &position_id.to_le_bytes()],
        bump,
    )]
    pub position_account: Account<'info, PositionAccount>,

    pub system_program: Program<'info, System>,
}
