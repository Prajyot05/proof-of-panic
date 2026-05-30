use anchor_lang::prelude::*;

/// Registry tracking the committed root of all position accounts.
///
/// PDA seeds: [b"position_registry"]
#[account]
pub struct PositionRegistry {
    /// Authority allowed to update the registry
    pub authority: Pubkey,

    /// Commitment root for all positions
    pub position_root: [u8; 32],

    /// Total positions included in the root
    pub position_count: u64,

    /// Slot when the root was last updated
    pub last_root_slot: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl PositionRegistry {
    pub const SIZE: usize = 8  // discriminator
        + 32  // authority
        + 32  // position_root
        + 8   // position_count
        + 8   // last_root_slot
        + 1;  // bump
}
