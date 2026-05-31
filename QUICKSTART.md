# Quickstart Guide

This guide will help you get the Proof of Panic environment running locally in under 5 minutes.

## 1. Install Prerequisites

Ensure you have the following installed:
- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v20+)
- [Solana CLI](https://docs.solanalabs.com/cli/install) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.30+)
- [SP1 CLI](https://docs.succinct.xyz/getting-started/install.html) (via `curl -L https://sp1.succinct.xyz | bash` and `sp1up`)

## 2. Install Dependencies

Install all NPM and Rust dependencies:

```bash
# In the repository root
npm install

# Install dashboard dependencies
cd app && npm install
cd ..
```

## 3. Start Local Validator

Open a new terminal and start the local Solana test validator. This must remain running in the background.

```bash
solana-test-validator --reset
```

## 4. Deploy and Initialize

In your main terminal, build the Anchor program, deploy it to your local validator, and initialize the mock positions.

```bash
# Build and deploy the Anchor program
anchor build
anchor deploy

# Initialize the protocol and 5 default positions
npx ts-node scripts/2-initialize.ts
```

## 5. Run the End-to-End Demo

Run the demo orchestration script. This will snapshot the state, run the off-chain simulator for a 30% crash, generate the SP1 zero-knowledge proof, and verify it on-chain to trigger the circuit breaker.

```bash
./scripts/demo.sh
```

*(Note: SP1 proof generation requires substantial CPU/RAM and may take 1-2 minutes on an M-series Mac, or longer on older hardware. For instantaneous demonstrations, use the pre-computed scenarios on the web dashboard).*

## 6. Launch the Dashboard

Start the Next.js war-room visualization dashboard:

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the live simulation dashboard.
