# Threat Model & Formal Specifications

A protocol of this magnitude requires rigorous adversarial analysis. This document formalizes the threat model for Proof of Panic and defines the security constraints enforced by the protocol.

## 1. Oracle Manipulation & Price Shocks
**Vector**: An attacker manipulates the Pyth oracle feed to artificially trigger a liquidation shock event and profit from keeper bounties.
**Mitigation**: Proof of Panic enforces that the pre-shock price embedded in the ZK proof strictly matches the live Pyth oracle feed at the moment of verification (`require!(pyth_price == public_values.pre_shock_price)`). Because the protocol utilizes a deterministic circuit breaker threshold, an attacker cannot profit by causing random liquidations unless the *actual* market index crosses the insolvency line.

## 2. Stale State Submission
**Vector**: A keeper submits a valid ZK proof of insolvency, but the proof was generated using a stale state from 10 blocks ago.
**Mitigation**: The zkVM proof must expose the exact `state_hash` of the PositionBook used during generation. The Anchor smart contract dynamically hashes the *live* on-chain `PositionBook` at the exact slot of execution. If the hash does not match, the proof is rejected (`StateHashMismatch`). This provides an absolute guarantee that the proof operates on the latest state.

## 3. Verifier Spoofing
**Vector**: An attacker bypasses the SP1 verifier by passing in a malicious "mock verifier" program ID, allowing them to submit arbitrary `PublicValues`.
**Mitigation**: The `submit_proof` instruction strictly enforces the `sp1_verifier` account address via an Anchor macro constraint:
`#[account(address = SUNSPOT_VERIFIER_PROGRAM_ID @ PanicError::InvalidVerifierProgram)]`

## 4. Keeper Spam & Vault Draining
**Vector**: Keepers continuously submit identical ZK proofs to drain the `reward_vault`.
**Mitigation**: The protocol uses a `min_proof_interval_slots` cool-down enforced on-chain. If a keeper submits a proof before the cooldown expires, the protocol updates the state but does NOT pay out the lamport reward, economically discouraging spam.

## 5. SP1 Prover Censorship
**Vector**: A centralized SP1 prover goes offline, preventing insolvency proofs from landing on-chain.
**Mitigation**: Proof of Panic utilizes an entirely permissionless keeper network. Anyone can pull the open-source prover software, fetch the on-chain state via an RPC node, run SP1 locally (or on a cloud instance), and submit the proof for the bounty.

## Formal Properties

- **Liveness**: Assuming at least one rational keeper exists, any state crossing the `circuit_breaker_threshold` will result in a protocol halt within $T_{prove} + T_{confirm}$ time.
- **Soundness**: It is computationally infeasible (assuming cryptographic security of Plonk/Groth16 and SHA-256) to forge a valid proof for a state that has not crossed the threshold.
- **Completeness**: Any valid state that crosses the threshold has a corresponding valid SP1 proof that will be accepted by the Anchor program.
