# Proof of Panic

> **A ZK-verified adversarial risk engine for Solana perpetual protocols.**

Proof of Panic is a protocol safety system that uses zero-knowledge proofs to enable trustless, automated risk management for perpetual exchanges on Solana. It runs expensive stress-test simulations off-chain, generates a cryptographic proof that the simulation was mathematically correct, verifies the proof on-chain for ~200,000 compute units (regardless of position count), and autonomously activates a circuit breaker when the protocol becomes unsafe.

## Why Zero-Knowledge Proofs?

Perpetual protocols face a fundamental problem: they need to stress-test their positions against adversarial market conditions, but on-chain simulation is prohibitively expensive.

| Approach | Trustless? | Affordable? | Scales? |
|:---------|:-----------|:------------|:--------|
| On-chain simulation | ✅ | ❌ ~50K CU/position | ❌ Hits tx limits at ~28 positions |
| Off-chain simulation (no proof) | ❌ Must trust simulator | ✅ | ✅ |
| **Off-chain + ZK proof** | **✅ Proof guarantees correctness** | **✅ ~200K CU total** | **✅ O(1) verification** |

A compromised simulator could report "protocol is safe" when it's actually insolvent. With ZK proofs, the circuit **re-derives all values from raw position data** — a malicious simulator cannot produce a valid proof for incorrect results.

## Architecture

```
   On-Chain (Solana)              Off-Chain (Local)              ZK Layer (Noir)
  ┌─────────────────┐          ┌─────────────────────┐        ┌──────────────────┐
  │  GlobalState     │◄── ① ──►│  TypeScript          │        │                  │
  │  RiskConfig      │ Snapshot │  Orchestrator        │        │  Noir Circuit     │
  │  PositionBook    │          └─────────┬───────────┘        │  (panic_proof)    │
  │  (zero-copy)     │                    │                    │                  │
  └────────┬─────────┘                    ▼                    │  Verifies:       │
           │                    ┌─────────────────────┐        │  • PnL math      │
           │ ⑤ Verify          │  Rust Simulator      │──③──►│  • Margin ratios  │
           │ + Circuit         │  (panic-simulator)   │        │  • Liquidations   │
           │   Breaker         │                      │        │  • Solvency       │
           │                    │  • apply_shock()     │        │  • Risk score     │
           ◄────── ④ ──────────│  • evaluate_pnl()    │        └──────────────────┘
                  Proof         │  • liquidate()       │              │ ④ Proof
                  + Results     │  • compute_solvency()│◄─────────────┘
                                └─────────────────────┘
```

## The Pipeline

| Step | What Happens | Time |
|:-----|:-------------|:-----|
| **① Snapshot** | TypeScript reads on-chain positions via RPC | ~1s |
| **② Simulate** | Rust engine applies market shock, computes liquidation cascade | ~2ms |
| **③ Prove** | Noir circuit compiles, generates ZK proof of simulation correctness | ~30s |
| **④ Verify** | Anchor program verifies state hash + ZK proof on-chain | ~200K CU |
| **⑤ Act** | If risk > threshold, circuit breaker fires: max leverage halved (10x → 5x) | Automatic |

## War Room Dashboard

The project includes a real-time visualization dashboard that animates the entire liquidation cascade:

- **Protocol health meter** — Radial gauge animating from green to red
- **Position cards** — Each trader's position with live health bars that deplete as margin erodes
- **Liquidation cascade timeline** — Step-by-step animated sequence of positions collapsing
- **Circuit breaker overlay** — Dramatic activation when the protocol enters emergency mode
- **ZK proof verification panel** — Visual pipeline from snapshot → proof → on-chain verification
- **5 adversarial scenarios** — Switch between different market conditions in real-time

```bash
cd app && npm run dev    # Opens at http://localhost:3000
```

## Adversarial Scenarios

The system is tested against 5 distinct market conditions:

| Scenario | Shock | Liquidated | Bad Debt | Outcome |
|:---------|:------|:-----------|:---------|:--------|
| **Volatility Shock** | SOL -30% | 4/5 | $21,590 | Circuit breaker fires |
| **Mild Correction** | SOL -10% | 4/5 | $0 | Insurance absorbs losses |
| **Flash Crash** | SOL -50% | 4/5 | $76,850 | Catastrophic insolvency |
| **Short Squeeze** | SOL +40% | 1/5 | $0 | Short crushed, longs profit |
| **Cascading Leverage** | SOL -30% | 8/8 | $108,695 | Total wipeout |

Generate all scenarios: `./scripts/generate-scenarios.sh`

## Performance

| Metric | Value |
|:-------|:------|
| Simulation (5 positions) | ~2ms |
| ZK proof generation | ~30s |
| Proof size | 388 bytes |
| On-chain verification | ~200,000 CU |
| Total on-chain storage | 700 bytes |
| Circuit gate count | ~31,000 |

Full benchmarks: [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md)

## Stack

- **Solana / Anchor** — On-chain program with zero-copy `#[repr(C)]` account layouts
- **Rust** — Deterministic off-chain liquidation cascade engine
- **Noir** — ZK circuit proving simulation correctness (~31K gates)
- **Sunspot** — Groth16 proof generation and on-chain Solana verifier
- **Next.js** — Protocol war-room dashboard with animated visualizations

## Prerequisites

```bash
# Solana CLI + Anchor
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.0 && avm use 0.32.0

# Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Sunspot (optional — for full Groth16 proofs)
git clone https://github.com/reilabs/sunspot.git
cd sunspot && go build -o sunspot . && mv sunspot /usr/local/bin/

# Node.js (v20+)
# https://nodejs.org/
```

## Quick Start

```bash
# 1. Build everything
./scripts/0-setup.sh

# 2. Start local validator (in a separate terminal)
solana-test-validator --reset

# 3. Run the full end-to-end demo
./scripts/demo.sh

# 4. Generate all adversarial scenarios
./scripts/generate-scenarios.sh

# 5. Launch the war-room dashboard
cd app && npm install && npm run dev
```

## Demo Flow

| Step | Command | What Happens |
|:-----|:--------|:-------------|
| 1 | `anchor deploy` | Deploy on-chain program |
| 2 | `npx ts-node scripts/2-initialize.ts` | Initialize protocol + 5 positions |
| 3 | `npx ts-node scripts/3-snapshot.ts` | Snapshot on-chain state to JSON |
| 4 | `./scripts/4-simulate.sh` | Simulate 30% SOL crash |
| 5 | `./scripts/5-prove.sh` | Generate ZK proof |
| 6 | `npx ts-node scripts/6-verify.ts` | Verify proof on-chain, trigger circuit breaker |
| 7 | `npx ts-node scripts/7-status.ts` | Display final protocol state |

## Project Structure

```
proof-of-panic/
├── programs/proof-of-panic/     # Anchor on-chain program
│   └── src/
│       ├── state/               # GlobalState, RiskConfig, PositionBook (zero-copy)
│       ├── instructions/        # 4 instructions (init, positions, proof, risk)
│       ├── constants.rs         # Seeds, scale factors, defaults
│       └── errors.rs            # Custom error codes
├── simulator/                   # Off-chain Rust stress-test engine
│   └── src/
│       ├── scenarios.rs         # 5 built-in adversarial scenarios
│       ├── shock.rs             # Market shock application
│       ├── liquidation.rs       # Cascade engine (PnL + margin + liquidation)
│       ├── solvency.rs          # Insurance fund + bad debt computation
│       ├── commitment.rs        # SHA-256 state hash
│       └── witness.rs           # Noir witness file generation
├── circuits/panic_proof/        # Noir ZK circuit
│   └── src/main.nr              # Proves simulation correctness
├── app/                         # Next.js war-room dashboard
│   └── src/app/page.tsx         # Animated visualization of all scenarios
├── scripts/                     # Demo orchestration
│   ├── demo.sh                  # Full end-to-end pipeline
│   └── generate-scenarios.sh    # Generate all 5 scenario datasets
└── docs/
    ├── ARCHITECTURE.md          # Technical paper (math, threat model, ZK rationale)
    └── BENCHMARKS.md            # Performance metrics and scaling analysis
```

## Key Design Decisions

- **Zero-copy PositionBook**: Single account with bytemuck `#[repr(C)]` layout. Enables deterministic byte serialization for SHA-256 hashing across Rust, Noir, and on-chain.
- **Fixed-point arithmetic**: All values in microdollars (10⁶ scale). No floating point — ensures bit-exact reproducibility across all three execution environments.
- **SHA-256 state commitment**: Flat hash of 512 canonical bytes. Anchors the ZK proof to actual on-chain state. Production path: Concurrent Merkle Tree for O(log N) scaling.
- **Feature-gated verification**: `test-mock-verify` flag bypasses Sunspot CPI in testing. Circuit still compiles and executes; only the on-chain verification CPI is skipped.

## Security

See the full threat model in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#threat-model).

Key security properties:
- **Malicious simulator protection**: ZK circuit re-derives all values from raw data — incorrect results cannot produce valid proofs
- **State anchoring**: On-chain SHA-256 of live PositionBook rejects proofs against stale/tampered state
- **Replay protection**: State hash uniqueness + slot tracking prevent proof reuse
- **False panic prevention**: Circuit constraints enforce correct risk score computation — cannot fabricate emergencies

## License

MIT
