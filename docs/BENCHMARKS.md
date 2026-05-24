# Proof of Panic — Performance Benchmarks

> Measured on localnet (Apple Silicon). Your results may vary based on hardware.

## Core Pipeline Metrics

| Metric | Value | Notes |
|:-------|:------|:------|
| **Simulation time** (5 positions) | ~2ms | Rust release build, deterministic computation |
| **Simulation time** (8 positions) | ~3ms | Cascading leverage scenario |
| **Noir circuit compilation** | 10–30s | `nargo compile`, depends on cache state |
| **Witness generation** | 2–5s | `nargo execute` |
| **Groth16 proof generation** | 10–30s | Via Sunspot (if available) |
| **Proof size** | 388 bytes | Standard Groth16 proof |
| **Circuit gate count** | ~31,000 | For 8 positions with PnL + margin + liquidation verification |

## On-Chain Costs

| Metric | Value | Notes |
|:-------|:------|:------|
| **GlobalState account** | 115 bytes | Borsh-serialized, standard account |
| **RiskConfig account** | 57 bytes | Borsh-serialized, standard account |
| **PositionBook account** | 528 bytes | Zero-copy (`#[repr(C)]`), 8 × 64-byte positions |
| **Total on-chain storage** | 700 bytes | All three accounts combined |
| **Rent-exempt cost** | ~0.008 SOL | At current rent rate |
| **Verification compute units** | ~200,000 CU | SHA-256 hash + proof CPI verification |
| **Initialization compute units** | ~50,000 CU | Creating all three accounts |

## Scenario Comparison

| Scenario | Positions | Liquidated | Bad Debt | Risk Score | Insurance Used |
|:---------|:----------|:-----------|:---------|:-----------|:---------------|
| Volatility Shock (SOL -30%) | 5 | 4 | $21,590 | 77.1% | 100% |
| Mild Correction (SOL -10%) | 5 | 4 | $0 | 32.7% | 32.7% |
| Flash Crash (SOL -50%) | 5 | 4 | $76,850 | 100% | 100% |
| Short Squeeze (SOL +40%) | 5 | 1 | $0 | 19.9% | 19.9% |
| Cascading Leverage (SOL -30%) | 8 | 8 | $108,695 | 100% | 100% |

## Scaling Analysis

| Positions | Canonical Bytes | SHA-256 Hashes | Estimated Gate Count | On-Chain Storage |
|:----------|:---------------|:---------------|:---------------------|:-----------------|
| 8 (current) | 512 B | 1 | ~31,000 | 528 B |
| 32 (Merkle) | 2,048 B | ~5 (tree path) | ~45,000 | ~2,064 B |
| 128 (Merkle) | 8,192 B | ~7 (tree path) | ~55,000 | ~8,208 B |
| 1,024 (Merkle) | 65,536 B | ~10 (tree path) | ~70,000 | CMT account |

*Merkle estimates are projections for a Concurrent Merkle Tree migration. Actual values would depend on implementation.*

## ZK Verification Cost: On-Chain vs. Off-Chain

| Approach | Cost per Position | 8 Positions | 100 Positions | 1,000 Positions |
|:---------|:-----------------|:------------|:--------------|:----------------|
| **On-chain simulation** | ~50,000 CU | 400,000 CU | 5,000,000 CU ❌ | 50,000,000 CU ❌ |
| **ZK verification** | ~0 CU (amortized) | ~200,000 CU ✅ | ~200,000 CU ✅ | ~200,000 CU ✅ |

*Solana's per-transaction compute limit is 1,400,000 CU. On-chain simulation exceeds this at ~28 positions. ZK verification cost is constant regardless of position count.*
