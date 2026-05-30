use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

/// Refresh the stored oracle price from a live Pyth feed.
pub fn handler(ctx: Context<RefreshOraclePrice>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let pyth_acc = &ctx.accounts.pyth_oracle;

    let pyth_data = pyth_acc.try_borrow_data()?;
    let price_account: &pyth_sdk_solana::state::SolanaPriceAccount =
        pyth_sdk_solana::state::load_price_account(&pyth_data)
            .map_err(|_| PanicError::InvalidOracle)?;

    let current_price = price_account
        .to_price_feed(&pyth_acc.key())
        .get_price_unchecked()
        .price;
    let expo = price_account.expo;

    let scaled = scale_pyth_price(current_price, expo)?;
    global_state.oracle_price = scaled;

    msg!("✓ Oracle price refreshed: ${}", scaled / SCALE);
    Ok(())
}

fn scale_pyth_price(price: i64, expo: i32) -> Result<u64> {
    if price <= 0 {
        return Err(PanicError::InvalidOracle.into());
    }

    let price = price as i128;
    let target_expo: i32 = -6;
    let expo_delta = target_expo - expo;

    let scaled = if expo_delta >= 0 {
        price
            .checked_mul(10_i128.pow(expo_delta as u32))
            .ok_or_else(|| error!(PanicError::ArithmeticOverflow))?
    } else {
        price
            .checked_div(10_i128.pow((-expo_delta) as u32))
            .ok_or_else(|| error!(PanicError::ArithmeticOverflow))?
    };

    if scaled <= 0 {
        return Err(PanicError::InvalidOracle.into());
    }

    Ok(scaled as u64)
}

#[derive(Accounts)]
pub struct RefreshOraclePrice<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: Validated by Pyth SDK
    pub pyth_oracle: UncheckedAccount<'info>,
}
