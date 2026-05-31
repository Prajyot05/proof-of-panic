# Deployment & Key Management

This document describes recommended deployment and key-management practices for Proof of Panic components (Judge Mode, Keeper, and CI).

1. Keeper Key Management

- Use a dedicated keeper signing key for proof submission. Do NOT store raw keypairs in repo.
- Preferred: use a cloud KMS (AWS KMS, GCP KMS, Azure Key Vault) to store and sign transactions.
- Alternative for small pilots: store the keypair JSON as an encrypted secret in GitHub Actions (`DEPLOY_KEYPAIR_JSON`) and load it in CI when deploying to devnet. Keep balances minimal.
- For local testing: set `JUDGE_MODE_PRIVATE_KEY` to a JSON array string in `.env` (only for local demo).

2. Judge Mode (Hosted)

- Judge Mode may optionally submit a real transaction to devnet. Configure `JUDGE_MODE_PRIVATE_KEY` environment variable in your hosting environment (Vercel Environment Variables) if you want the hosted site to sign and submit transactions.
- Recommended: leave Judge Mode unsigned in public hosts and provide a serialized transaction for users to inspect. Only enable automatic signed submissions for private demos.

3. CI Deployment Keys

- For automated devnet deployment, store the deploy key JSON in `secrets.SOLANA_KEYPAIR_JSON` and restrict access to repository admins.
- The `e2e-verify` job will also use `secrets.DEPLOY_KEYPAIR_JSON` to run verification scripts. Keep this distinct from production keys.

4. Keeper Operations & Secrets

- Keepers must have private keys for submitting transactions. In production, run keepers on infrastructure with KMS/HSM and do not expose keys to application logs.
- Use a vault (HashiCorp Vault recommended) or cloud provider secret manager to rotate keys.

5. Monitoring & Alerts

- Expose Prometheus `/metrics` from keeper and monitor the following metrics:
  - `proof_of_panic_sp1_proof_generation_time_seconds`
  - `proof_of_panic_active_risk_score`
  - `proof_of_panic_circuit_breaker_active`
- Configure alerting for repeated proof generation failures and for high-risk events (risk_score > threshold) to a pager/Slack channel.

6. Governance & CPI Controls (Operational Guidance)

- The `submit_proof_and_verify` instruction performs on-chain actions via CPI. For production, the target protocol MUST gate CPI actions with multisig or governance.
- Do not allow a single keeper identity to act as the final authority for pausing production trading without protocol governance involvement.

7. Quick local run

```bash
# Build prover and simulate a proof locally
./scripts/5-prove.sh
# Submit local proof to local validator
RPC_URL=http://127.0.0.1:8899 node ./scripts/6-verify.ts
```
