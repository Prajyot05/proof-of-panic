use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::PanicError;
use crate::state::*;

/// Populate the PositionBook with 5 demo positions.
///
/// The positions are designed to create a compelling liquidation cascade
/// narrative when a 30% SOL price shock is applied:
///
/// - Position 0: LONG 10x, $10k collateral @ $150 — safe, survives the shock
/// - Position 1: LONG 15x, $5k collateral @ $155 — marginal, gets liquidated
/// - Position 2: LONG 20x, $3k collateral @ $160 — dangerous, gets liquidated with loss
/// - Position 3: SHORT 5x, $8k collateral @ $145 — safe, profits from the drop
/// - Position 4: LONG 25x, $2k collateral @ $158 — extreme, liquidated with max bad debt
pub fn handler(ctx: Context<InitializePositions>) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;

    require!(
        global_state.authority == ctx.accounts.authority.key(),
        PanicError::Unauthorized
    );

    require!(
        global_state.total_positions == 0,
        PanicError::PositionsAlreadyInitialized
    );

    let mut position_book = ctx.accounts.position_book.load_mut()?;

    // Generate deterministic "owner" pubkeys from seeds for reproducibility
    let demo_owners: [[u8; 32]; 5] = [
        owner_bytes(b"trader_alice"),
        owner_bytes(b"trader_bob"),
        owner_bytes(b"trader_charlie"),
        owner_bytes(b"trader_diana"),
        owner_bytes(b"trader_eve"),
    ];

    // Position 0: LONG 10x, $10,000 collateral, entry $150.00 — HEALTHY
    position_book.positions[0] = Position {
        owner: demo_owners[0],
        collateral: 10_000 * SCALE,      // $10,000
        size: 100_000 * SCALE,            // $100,000 notional (10x leverage)
        entry_price: 150 * SCALE,         // $150.00
        is_long: 1,
        is_open: 1,
        _padding: [0u8; 6],
    };

    // Position 1: LONG 15x, $5,000 collateral, entry $155.00 — MARGINAL
    position_book.positions[1] = Position {
        owner: demo_owners[1],
        collateral: 5_000 * SCALE,        // $5,000
        size: 75_000 * SCALE,             // $75,000 notional (15x leverage)
        entry_price: 155 * SCALE,         // $155.00
        is_long: 1,
        is_open: 1,
        _padding: [0u8; 6],
    };

    // Position 2: LONG 20x, $3,000 collateral, entry $160.00 — DANGEROUS
    position_book.positions[2] = Position {
        owner: demo_owners[2],
        collateral: 3_000 * SCALE,        // $3,000
        size: 60_000 * SCALE,             // $60,000 notional (20x leverage)
        entry_price: 160 * SCALE,         // $160.00
        is_long: 1,
        is_open: 1,
        _padding: [0u8; 6],
    };

    // Position 3: SHORT 5x, $8,000 collateral, entry $145.00 — SAFE (benefits from drop)
    position_book.positions[3] = Position {
        owner: demo_owners[3],
        collateral: 8_000 * SCALE,        // $8,000
        size: 40_000 * SCALE,             // $40,000 notional (5x leverage)
        entry_price: 145 * SCALE,         // $145.00
        is_long: 0,                       // SHORT
        is_open: 1,
        _padding: [0u8; 6],
    };

    // Position 4: LONG 25x, $2,000 collateral, entry $158.00 — EXTREME RISK
    position_book.positions[4] = Position {
        owner: demo_owners[4],
        collateral: 2_000 * SCALE,        // $2,000
        size: 50_000 * SCALE,             // $50,000 notional (25x leverage)
        entry_price: 158 * SCALE,         // $158.00
        is_long: 1,
        is_open: 1,
        _padding: [0u8; 6],
    };

    position_book.count = 5;
    global_state.total_positions = 5;

    msg!("✓ 5 demo positions initialized");
    msg!("  Position 0: LONG 10x, $10,000 @ $150.00 [HEALTHY]");
    msg!("  Position 1: LONG 15x, $5,000 @ $155.00  [MARGINAL]");
    msg!("  Position 2: LONG 20x, $3,000 @ $160.00  [DANGEROUS]");
    msg!("  Position 3: SHORT 5x, $8,000 @ $145.00  [SAFE]");
    msg!("  Position 4: LONG 25x, $2,000 @ $158.00  [EXTREME]");

    Ok(())
}

/// Generate a deterministic 32-byte "owner" from a seed.
/// These aren't real keypairs — just reproducible identifiers for the demo.
fn owner_bytes(seed: &[u8]) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(seed);
    let result = hasher.finalize();
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&result);
    bytes
}

#[derive(Accounts)]
pub struct InitializePositions<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [POSITION_BOOK_SEED],
        bump,
    )]
    pub position_book: AccountLoader<'info, PositionBook>,
}
