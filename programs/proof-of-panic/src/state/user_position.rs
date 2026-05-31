use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};

use crate::constants::MAX_POSITIONS;

/// A single leveraged position in the simplified perpetuals model.
///
/// Uses `#[repr(C)]` for deterministic memory layout compatible with
/// bytemuck zero-copy deserialization. All monetary values in microdollars.
///
/// Size: 32 + 8 + 8 + 8 + 1 + 1 + 6 = 64 bytes per position
#[zero_copy]
#[repr(C)]
#[derive(Debug, PartialEq)]
pub struct Position {
    /// Owner pubkey as raw bytes (Pubkey isn't Pod-compatible)
    pub owner: [u8; 32],

    /// Collateral deposited, in microdollars
    pub collateral: u64,

    /// Notional position size, in microdollars
    pub size: u64,

    /// Entry price, in microdollars
    pub entry_price: u64,

    /// 1 = long, 0 = short
    pub is_long: u8,

    /// 1 = open, 0 = closed/liquidated
    pub is_open: u8,

    /// Padding for 8-byte alignment
    pub _padding: [u8; 6],
}

impl Position {
    pub const SIZE: usize = 64;
}

/// The full position book — a zero-copy account containing a fixed-size
/// array of positions. Using a single account instead of per-user accounts
/// to simplify snapshot serialization, hash commitment, and the SP1 zkVM proof generation.
///
/// PDA: seeds = [b"position_book"]
/// Layout: Zero-copy via bytemuck
///
/// Total size: 8 (discriminator) + 1 (count) + 7 (padding) + 8 * 64 (positions)
///           = 8 + 8 + 512 = 528 bytes
#[account(zero_copy)]
#[repr(C)]
pub struct PositionBook {
    /// Number of active positions
    pub count: u8,

    /// Alignment padding
    pub _padding: [u8; 7],

    /// Fixed-size position array
    pub positions: [Position; MAX_POSITIONS],
}

impl PositionBook {
    /// Total account size including Anchor's 8-byte discriminator
    pub const SIZE: usize = 8 + 1 + 7 + (MAX_POSITIONS * Position::SIZE);

    /// Serialize all open positions to canonical bytes for SHA-256 hashing.
    /// The exact same serialization must be used in the Rust simulator and SP1 zkVM.
    ///
    /// Format: for each position [0..MAX_POSITIONS]:
    ///   owner (32 bytes) | collateral (8 bytes LE) | size (8 bytes LE) |
    ///   entry_price (8 bytes LE) | is_long (1 byte) | is_open (1 byte) | padding (6 bytes)
    ///
    /// This is effectively just the raw bytes of the positions array since
    /// we use `#[repr(C)]` layout.
    pub fn canonical_bytes(&self) -> Vec<u8> {
        // Cast the positions array to raw bytes via bytemuck
        bytemuck::bytes_of(&self.positions).to_vec()
    }
}
