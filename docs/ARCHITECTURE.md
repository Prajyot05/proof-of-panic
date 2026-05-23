# Architecture

See [implementation_plan.md](../../.gemini/antigravity-ide/brain/4e46dd34-e9b2-48bf-aa11-3174c091044e/implementation_plan.md) for the full architecture document.

## Key Components

### On-Chain Program (Anchor)
- **GlobalState** — protocol health, circuit breaker, insurance fund
- **RiskConfig** — maintenance margin, leverage limits, thresholds
- **PositionBook** — zero-copy array of 8 positions (bytemuck `#[repr(C)]`)
- 4 instructions: `initialize_protocol`, `initialize_positions`, `submit_proof_and_verify`, `update_risk_params`

### Off-Chain Simulator (Rust)
- Deterministic liquidation cascade engine
- Reads JSON snapshot, applies price shock, computes PnL/margin/losses
- Outputs Noir witness files (`Prover.toml`, `Verifier.toml`)

### ZK Circuit (Noir)
- Proves simulation correctness via SHA-256 state commitment + arithmetic verification
- ~31k gates, provable locally in 10-30s
- Verified on-chain via Sunspot/Groth16 CPI

### Dashboard (Next.js)
- Protocol war-room aesthetic
- Visualizes positions, cascade, proof status, circuit breaker
