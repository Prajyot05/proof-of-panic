//! SHA-256 state commitment computation.
//!
//! Computes a deterministic hash of the positions array that can be
//! verified both in the Noir circuit and on-chain.

use sha2::{Digest, Sha256};

use crate::types::*;

/// Compute SHA-256 hash of all positions in canonical byte format.
///
/// The canonical format matches the on-chain `#[repr(C)]` Position layout:
/// For each position [0..MAX_POSITIONS]:
///   owner(32) | collateral(8 LE) | size(8 LE) | entry_price(8 LE) |
///   is_long(1) | is_open(1) | padding(6)
///
/// Unused position slots are all zeros.
pub fn compute_state_hash(positions: &[SimPosition]) -> [u8; 32] {
    let mut all_bytes = Vec::with_capacity(MAX_POSITIONS * POSITION_BYTE_SIZE);

    // Serialize each position to canonical bytes
    for pos in positions {
        all_bytes.extend_from_slice(&pos.canonical_bytes());
    }

    // Pad remaining slots with zeros
    for _ in positions.len()..MAX_POSITIONS {
        all_bytes.extend_from_slice(&[0u8; POSITION_BYTE_SIZE]);
    }

    assert_eq!(
        all_bytes.len(),
        MAX_POSITIONS * POSITION_BYTE_SIZE,
        "Canonical bytes must be exactly {} bytes",
        MAX_POSITIONS * POSITION_BYTE_SIZE
    );

    let mut hasher = Sha256::new();
    hasher.update(&all_bytes);
    let result = hasher.finalize();

    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_hash() {
        let positions = vec![SimPosition {
            owner: "aa".repeat(32),
            collateral: 10_000 * SCALE,
            size: 100_000 * SCALE,
            entry_price: 150 * SCALE,
            is_long: true,
            is_open: true,
        }];

        let hash1 = compute_state_hash(&positions);
        let hash2 = compute_state_hash(&positions);
        assert_eq!(hash1, hash2, "Same inputs must produce same hash");
    }

    #[test]
    fn test_different_positions_different_hash() {
        let pos1 = vec![SimPosition {
            owner: "aa".repeat(32),
            collateral: 10_000 * SCALE,
            size: 100_000 * SCALE,
            entry_price: 150 * SCALE,
            is_long: true,
            is_open: true,
        }];
        let pos2 = vec![SimPosition {
            owner: "aa".repeat(32),
            collateral: 10_001 * SCALE, // 1 microdollar difference
            size: 100_000 * SCALE,
            entry_price: 150 * SCALE,
            is_long: true,
            is_open: true,
        }];

        assert_ne!(
            compute_state_hash(&pos1),
            compute_state_hash(&pos2),
            "Different inputs must produce different hash"
        );
    }

    #[test]
    fn test_empty_positions() {
        let hash = compute_state_hash(&[]);
        assert_ne!(hash, [0u8; 32], "Empty position book still produces a non-zero hash");
    }
}
