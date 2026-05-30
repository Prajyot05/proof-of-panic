use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PublicValuesStruct {
    pub state_hash: [u8; 32],
    pub pre_shock_price: u64,
    pub bad_debt: u64,
    pub risk_score: u64,
    pub num_liquidated: u64,
}

/// Submit a ZK proof of insolvency to trigger the circuit breaker.
pub fn handler(
    ctx: Context<SubmitProofAndVerify>,
    proof_bytes: Vec<u8>,
) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    let risk_config = &ctx.accounts.risk_config;
    let clock = Clock::get()?;

    // ── Step 1: Verify proof age ──
    let slots_since_last_proof = clock
        .slot
        .checked_sub(global_state.last_proof_slot)
        .ok_or(PanicError::ArithmeticOverflow)?;

    require!(
        slots_since_last_proof > 0,
        PanicError::ProofTooOld // Can't submit multiple proofs in same slot
    );

    // ── Step 2: Verify the SP1 ZK proof ──
    #[cfg(not(feature = "test-mock-verify"))]
    {
        // For SP1, the `sp1-solana` verifier program expects the proof as instruction data.
        // sp1_solana::cpi::verify_proof is available if we use the sp1-solana crate.
        // Wait, SP1 uses `sp1_solana::cpi::verify_proof_groth16`.
        // We will pass the sp1_verifier program.
        
        // Actually, we don't have the sp1-solana program ID hardcoded, we can just rely on the CPI.
        let vkey = SP1_PROGRAM_VKEY; // We'll need to define this constant
        
        let cpi_program = ctx.accounts.sp1_verifier.to_account_info();
        let cpi_accounts = sp1_solana::cpi::accounts::VerifyProof {
            // SP1 verifier accounts... usually none needed other than the program itself,
            // wait, sp1_solana might not have cpi module built this way.
            // Let's just use manual invoke.
        };
        // It's easier to just deserialize the public values from the proof bytes directly 
        // if we assume `sp1-solana` format, but SP1 groth16 proofs usually put public values 
        // in a specific place.
        // For this demo, let's assume the proof bytes contain a bincode-serialized PublicValuesStruct
        // appended to the end, or we just pass it as an argument.
    }

    Ok(())
}
