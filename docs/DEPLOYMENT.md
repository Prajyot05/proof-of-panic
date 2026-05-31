# Deployment & Operations Guide

This document covers the operational requirements for running the **Proof of Panic** protocol and its associated Keeper bots in a production or live-devnet environment.

## 1. Key Management & Private Keys

The architecture consists of two primary components requiring private keys:

### A. The Keeper
#### Option A: Render (Free Web Service / Background Worker)
1. Sign up on [Render.com](https://render.com/).
2. Click **New +** -> **Web Service** (or Background Worker).
3. Connect your GitHub Repository.
4. Configure the service:
   - **Root Directory:** *(Leave this completely empty!)*
   - **Build Command:** `npm install && cd packages/sdk && npm run build`
   - **Start Command:** `cd keeper && npm start`
   - **Instance Type:** **Free**

**Security:**
- The Keeper needs a funded Solana wallet to pay for gas fees.
- **NEVER** commit the Keeper's private key.
- **Best Practice:** Pass the key as a base64 string or JSON array via the `KEEPER_KEYPAIR` environment variable securely injected at runtime (e.g., Render Secrets, AWS Secrets Manager, GitHub Actions Secrets).

### B. Judge Mode (Next.js Frontend)
The frontend API route `/api/verify` supports a "Judge Mode" which attempts to submit transactions directly on-chain using precomputed proofs to demonstrate functionality to hackathon judges without needing to spin up the Keeper.

**Security:**
- The frontend route requires `JUDGE_MODE_PRIVATE_KEY` set in Vercel's Environment Variables.
- This key should belong to a **disposable, low-balance wallet** funded with just enough Devnet SOL to pay for transactions.
- Do not use a mainnet key or an administrative authority key for this purpose.

## 2. Governance & Multisig Gating

The Anchor contract (`submit_proof.rs`) includes a `require_admin_approval` flag in its Risk Config.

When enabled (`true`):
- The `submit_proof_and_verify` instruction **requires** an additional signer: the protocol's `admin` authority.
- In a production environment, this `admin` account should be an **SPL Governance DAO** or a **Squads Multisig**.
- The Keeper bot would submit a proposal containing the SP1 proof. The DAO/Multisig would vote to approve the proposal, and the transaction would be executed by the governance program, satisfying the `admin_info.is_signer` constraint.

## 3. Running the Keeper

We provide a pre-built Docker setup to run the Keeper, alongside Prometheus and Grafana for monitoring.

```bash
docker-compose up --build -d
```

This starts:
- **Keeper (Port 10000):** Runs the core Node.js polling loop and exposes a `/metrics` endpoint.
- **Prometheus (Port 9090):** Scrapes the Keeper metrics.
- **Grafana (Port 3000):** Visualizes the metrics (Default Login: `admin/admin`).

### Keeper Environment Variables

| Variable | Description |
|----------|-------------|
| `RPC_URL` | Solana RPC endpoint (e.g., Helius, Triton, QuickNode). |
| `KEEPER_KEYPAIR` | JSON array format of the Keeper's funded wallet. |
| `PROGRAM_ID` | The deployed Anchor Program ID. |
| `SP1_PROVER` | Use `network` to offload to Succinct Cloud or `local` for local execution. |
| `SP1_PRIVATE_KEY` | Succinct API Key if using `SP1_PROVER=network`. |
| `PORT` | Port for the Prometheus metrics server (default `10000`). |

## 4. CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) is configured to:
1. Run Rust clippy, formatting checks, and Anchor tests.
2. Build the Next.js frontend and `@proof-of-panic/sdk`.
3. Automate deployment to Solana Devnet on pushes to `main` (Requires `SOLANA_KEYPAIR_JSON` secret).
4. Run an E2E Smoke Test (`scripts/ci-verify.ts`) using the committed, pre-generated SP1 proof artifacts against the live Devnet deployment.

