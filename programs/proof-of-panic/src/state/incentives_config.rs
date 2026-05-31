use anchor_lang::prelude::*;

/// Incentives configuration for proof submissions.
///
/// PDA seeds: [b"incentives_config"]
#[account]
pub struct IncentivesConfig {
    /// Authority allowed to update incentives
    pub authority: Pubkey,

    /// Reward paid per accepted proof (lamports)
    pub reward_lamports: u64,

    /// Minimum slots between rewarded proofs
    pub min_proof_interval_slots: u64,

    /// Whether incentives are enabled
    pub enabled: bool,

    /// Reward vault bump
    pub reward_vault_bump: u8,

    /// PDA bump seed
    pub bump: u8,
}

impl IncentivesConfig {
    pub const SIZE: usize = 8  // discriminator
        + 32  // authority
        + 8   // reward_lamports
        + 8   // min_proof_interval_slots
        + 1   // enabled
        + 1   // reward_vault_bump
        + 1; // bump
}
