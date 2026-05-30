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
    public_values_bytes: Vec<u8>,
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
        slots_since_last_proof > MAX_PROOF_AGE_SLOTS,
        PanicError::ProofTooOld 
    );

    // ── Step 1.5: Bind public inputs to instruction arguments ──
    let public_values: PublicValuesStruct = 
        PublicValuesStruct::try_from_slice(&public_values_bytes)
        .map_err(|_| PanicError::InvalidRiskParam)?;

    require!(public_values.state_hash == global_state.last_state_hash, PanicError::InvalidRiskParam);

    // ── Step 1.6: Oracle integration (Pyth) ──
    if let Some(pyth_acc) = &ctx.accounts.pyth_oracle {
        let pyth_data = pyth_acc.try_borrow_data()?;
        let price_account: &pyth_sdk_solana::state::SolanaPriceAccount = 
            pyth_sdk_solana::state::load_price_account(&pyth_data)
            .map_err(|_| PanicError::InvalidOracle)?;
            
        let current_price = price_account.to_price_feed(&pyth_acc.key()).get_price_unchecked().price;
        let expo = price_account.expo;
        
        msg!("Live Pyth price: {}, expo: {}", current_price, expo);
    }

    msg!("✓ Public inputs securely bound to instruction arguments");

    // ── Step 2: Verify the ZK proof ──
    #[cfg(not(feature = "test-mock-verify"))]
    {
        let verifier_program = &ctx.accounts.sp1_verifier;
        
        let mut verify_data = Vec::with_capacity(proof_bytes.len() + public_values_bytes.len());
        verify_data.extend_from_slice(&proof_bytes);
        verify_data.extend_from_slice(&public_values_bytes);

        let verify_ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: verifier_program.key(),
            accounts: vec![],
            data: verify_data,
        };

        anchor_lang::solana_program::program::invoke(&verify_ix, &[])?;

        msg!("✓ SP1 ZK proof verified via CPI");
    }

    #[cfg(feature = "test-mock-verify")]
    {
        msg!("⚠ Mock verification mode: proof accepted without CPI");
    }

    // ── Step 3: Update protocol state ──
    global_state.last_proof_slot = clock.slot;
    global_state.last_risk_score = public_values.risk_score;

    msg!("Risk score: {}/{} ({}.{}%)",
        public_values.risk_score,
        RISK_SCORE_MAX,
        public_values.risk_score * 100 / RISK_SCORE_MAX,
        (public_values.risk_score * 10000 / RISK_SCORE_MAX) % 100,
    );
    msg!("Bad debt: ${}", public_values.bad_debt / SCALE);
    msg!("Liquidated positions: {}", public_values.num_liquidated);

    // ── Step 4: Circuit breaker logic ──
    if public_values.risk_score > risk_config.circuit_breaker_threshold {
        global_state.circuit_breaker_active = true;
        global_state.circuit_breaker_activation_slot = clock.slot;

        // Reduce max leverage by 50%
        let reduced_leverage = global_state
            .max_leverage
            .checked_mul(CB_LEVERAGE_REDUCTION_BPS)
            .ok_or(PanicError::ArithmeticOverflow)?
            / BPS_DENOMINATOR;

        let old_leverage = global_state.max_leverage;
        global_state.max_leverage = reduced_leverage;

        msg!("══════════════════════════════════════════════");
        msg!("⚠️  CIRCUIT BREAKER ACTIVATED");
        msg!("  Risk score {} exceeds threshold {}",
            public_values.risk_score, risk_config.circuit_breaker_threshold);
        msg!("  Max leverage reduced: {}x → {}x",
            old_leverage / SCALE,
            reduced_leverage / SCALE);
        msg!("══════════════════════════════════════════════");
    } else {
        msg!("✓ Protocol is within safe parameters — no circuit breaker needed");
    }

    Ok(())
}

#[derive(Accounts)]
pub struct SubmitProofAndVerify<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
        has_one = authority @ PanicError::Unauthorized,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        seeds = [RISK_CONFIG_SEED],
        bump = risk_config.bump,
    )]
    pub risk_config: Account<'info, RiskConfig>,

    #[account(
        seeds = [POSITION_BOOK_SEED],
        bump,
    )]
    pub position_book: AccountLoader<'info, PositionBook>,

    #[cfg(not(feature = "test-mock-verify"))]
    /// CHECK: SP1 Verifier Program
    pub sp1_verifier: UncheckedAccount<'info>,

    /// Optional Pyth oracle price feed account.
    /// CHECK: Validated by Pyth SDK
    pub pyth_oracle: Option<UncheckedAccount<'info>>,
}
