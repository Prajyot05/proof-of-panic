# Protocol Scaling Architecture: The Concurrent Merkle Tree (CMT) Pivot

This document outlines the architectural roadmap for scaling the Proof of Panic ZK risk engine from its initial V1 (linear state array) to V2 (mainnet deployment with 10,000+ positions).

## The V1 Architecture (Current)

In the current version, the Solana program stores a `PositionBook` containing a flat array of all open positions. When a proof is submitted, the program dynamically serializes the entire array and computes a flat SHA-256 hash:
`let computed_state_hash = hash(positions_bytes);`

This works flawlessly for a limited number of positions, providing absolute integrity. However, it imposes an $O(N)$ computational cost on both the SP1 zkVM guest (which must hash $N$ positions) and the Solana compute budget if $N$ grows too large.

## The V2 Architecture (Mainnet Target)

To support unlimited scale, Proof of Panic V2 replaces the flat position array with a **Concurrent Merkle Tree (CMT)**.

### 1. On-Chain State
The Anchor program will store only a 32-byte `state_root`. Each individual user's position will be stored in a dynamically allocated PDA. When a user opens or modifies a position, a keeper off-chain updates the CMT and the user submits a small inclusion proof to update the on-chain `state_root`.

### 2. The SP1 Prover Guest
Instead of taking the entire state as public inputs, the SP1 guest circuit takes:
- **Public Inputs:** `state_root` (pre-shock) and `state_root` (post-shock/liquidations).
- **Private Inputs (Witness):** The specific subset of accounts that are underwater, along with their Merkle inclusion proofs.

The zkVM guest verifies the inclusion proofs against the `state_root`, executes the liquidation math ONLY on the underwater subset, computes the new `state_root`, and outputs it. 

### 3. Asymptotic Scaling Analysis
The power of ZK is that the on-chain verification cost is $O(1)$. 

By using a CMT, the cost to *generate* the proof inside SP1 drops from $O(N)$ (where $N$ is total global users) to $O(K \log N)$ (where $K$ is the number of users actually being liquidated).

| Metric | V1 (Flat Array) | V2 (CMT) |
| --- | --- | --- |
| **On-Chain Storage** | $O(N)$ monolithic | $O(N)$ distributed PDAs, $O(1)$ state root |
| **zkVM Cycles** | $O(N)$ | $O(K \log N)$ |
| **Max Concurrent Users** | ~50 (Compute Limit) | Practically Infinite |

## Conclusion
The linear hashing method used in V1 is an exact mathematical equivalent to a Merkle root over a depth-1 tree. By replacing `hash(array)` with a standard Sparse Merkle Tree (SMT) library, the entire SP1 liquidation logic remains identical, proving that this architecture represents a highly viable path to a mainnet Solana perpetuals risk engine.
