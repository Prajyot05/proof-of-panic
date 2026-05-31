use anchor_lang::prelude::*;

/// Per-position account for scalable position storage.
///
/// PDA seeds: [b"position_account", owner, position_id]
#[account]
pub struct PositionAccount {
    /// Position owner
    pub owner: Pubkey,

    /// Position identifier scoped to owner
    pub position_id: u64,

    /// Collateral in microdollars
    pub collateral: u64,

    /// Notional size in microdollars
    pub size: u64,

    /// Entry price in microdollars
    pub entry_price: u64,

    /// 1 = long, 0 = short
    pub is_long: u8,

    /// 1 = open, 0 = closed
    pub is_open: u8,

    /// PDA bump seed
    pub bump: u8,
}

impl PositionAccount {
    pub const SIZE: usize = 8  // discriminator
        + 32  // owner
        + 8   // position_id
        + 8   // collateral
        + 8   // size
        + 8   // entry_price
        + 1   // is_long
        + 1   // is_open
        + 1; // bump
}
