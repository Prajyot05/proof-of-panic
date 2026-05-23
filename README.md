# Proof of Panic

> A ZK-verified adversarial risk engine for Solana perpetual protocols.

## What This Does

Proof of Panic is a protocol safety system that:

1. **Simulates** a simplified perpetuals environment with leveraged positions
2. **Injects** a market shock (e.g., SOL -30%) off-chain
3. **Computes** the resulting liquidation cascades and bad debt deterministically
4. **Generates** a Noir zero-knowledge proof that the simulation was correct
5. **Verifies** the proof on-chain in a Solana program via Sunspot/Groth16
6. **Activates** a circuit breaker when the protocol becomes unsafe

Everything runs locally with zero infrastructure cost.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL MACHINE                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Anchor       │    │  Off-chain    │    │  Noir Circuit  │  │
│  │  Program      │◄───│  Simulator    │───►│  + Sunspot     │  │
│  │  (on-chain)   │    │  (Rust bin)   │    │  (proof gen)   │  │
│  └──────────────┘    └──────────────┘    └───────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  solana-test-validator (local)                        │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Stack

- **Solana / Anchor** — on-chain program with zero-copy account layouts
- **Rust** — off-chain deterministic liquidation simulator
- **Noir** — ZK circuit proving simulation correctness
- **Sunspot** — Groth16 proof generation and on-chain verification
- **Next.js** — protocol war-room dashboard (coming soon)

## Prerequisites

```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.32.0 && avm use 0.32.0

# Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Sunspot
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

# 3. Run the full demo
./scripts/demo.sh
```

## Demo Flow

| Step | What Happens | Command |
|:-----|:-------------|:--------|
| 1 | Deploy program | `anchor deploy` |
| 2 | Initialize protocol + 5 positions | `npx ts-node scripts/2-initialize.ts` |
| 3 | Snapshot on-chain state | `npx ts-node scripts/3-snapshot.ts` |
| 4 | Simulate 30% SOL crash | `./scripts/4-simulate.sh` |
| 5 | Generate ZK proof | `./scripts/5-prove.sh` |
| 6 | Verify proof on-chain | `npx ts-node scripts/6-verify.ts` |
| 7 | Display final state | `npx ts-node scripts/7-status.ts` |

## Project Structure

```
proof-of-panic/
├── programs/proof-of-panic/   # Anchor on-chain program
│   └── src/
│       ├── state/             # Account structs (GlobalState, RiskConfig, PositionBook)
│       ├── instructions/      # 4 instructions (init, positions, proof, risk)
│       ├── constants.rs       # Seeds, scale factors, defaults
│       └── errors.rs          # Custom error codes
├── simulator/                 # Off-chain Rust stress-test engine
│   └── src/
│       ├── shock.rs           # Market shock (single price drop)
│       ├── liquidation.rs     # Cascade engine (PnL + margin + liquidation)
│       ├── solvency.rs        # Insurance fund + bad debt
│       ├── commitment.rs      # SHA-256 state hash
│       └── witness.rs         # Noir witness file generation
├── circuits/panic_proof/      # Noir ZK circuit
│   └── src/main.nr            # Proves simulation correctness
├── scripts/                   # Demo orchestration scripts
├── app/                       # Next.js dashboard (coming soon)
└── tests/                     # LiteSVM + integration tests
```

## Key Design Decisions

- **Zero-copy PositionBook**: Single account with bytemuck `#[repr(C)]` layout for efficient reads
- **SHA-256 state commitment**: Flat hash (not Merkle tree) — simpler, sufficient for 8 positions
- **Fixed-point arithmetic**: All values in microdollars (10^6 scale) — no floating point
- **Feature-gated verification**: `test-mock-verify` flag bypasses Sunspot CPI in tests

## License

MIT
