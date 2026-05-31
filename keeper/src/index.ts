import express from "express";
import * as promClient from "prom-client";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { ProofOfPanicClient } from "@proof-of-panic/sdk";

const app = express();
const port = process.env.PORT || 8080;

// Initialize Prometheus registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Define custom metrics
const activeRiskScoreGauge = new promClient.Gauge({
  name: "proof_of_panic_active_risk_score",
  help: "Current risk score of the protocol",
});

const circuitBreakerStatusGauge = new promClient.Gauge({
  name: "proof_of_panic_circuit_breaker_active",
  help: "1 if circuit breaker is active, 0 otherwise",
});

const sp1ProofGenerationTime = new promClient.Histogram({
  name: "proof_of_panic_sp1_proof_generation_time_seconds",
  help: "Time taken to generate SP1 proofs",
  buckets: [10, 30, 60, 120, 300, 600],
});

register.registerMetric(activeRiskScoreGauge);
register.registerMetric(circuitBreakerStatusGauge);
register.registerMetric(sp1ProofGenerationTime);

// Setup Solana Connection
const connection = new Connection(
  process.env.RPC_URL || "http://127.0.0.1:8899",
  "confirmed",
);
let provider: anchor.AnchorProvider;
if (process.env.KEEPER_PRIVATE_KEY) {
  try {
    const key = JSON.parse(process.env.KEEPER_PRIVATE_KEY);
    // NodeWallet expects a Keypair-like object
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NodeWallet = require("@coral-xyz/anchor/dist/cjs/nodewallet").default;
    const kp = new (require("@solana/web3.js").Keypair)({
      secretKey: Uint8Array.from(key),
    });
    const nodeWallet = new NodeWallet(kp);
    provider = new anchor.AnchorProvider(connection, nodeWallet, {
      preflightCommitment: "confirmed",
    });
  } catch (e: any) {
    console.warn(
      "[Keeper] Invalid KEEPER_PRIVATE_KEY; falling back to unsigned provider.",
    );
    provider = new anchor.AnchorProvider(connection, {} as any, {
      preflightCommitment: "confirmed",
    });
  }
} else {
  provider = new anchor.AnchorProvider(connection, {} as any, {
    preflightCommitment: "confirmed",
  });
}
const client = new ProofOfPanicClient(provider);
const { globalStatePda } = client.getPDAs();

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Mock simulation of proof generation for demo purposes
async function simulateProofGeneration() {
  const end = sp1ProofGenerationTime.startTimer();
  // Simulate latency
  await new Promise((resolve) =>
    setTimeout(resolve, 2000 + Math.random() * 3000),
  );
  end();
}

async function pollRiskState() {
  try {
    const globalState =
      await (client.program.account as any).globalState.fetch(globalStatePda);

    // Update metrics
    activeRiskScoreGauge.set(globalState.lastRiskScore.toNumber());
    circuitBreakerStatusGauge.set(globalState.circuitBreakerActive ? 1 : 0);

    console.log(
      `[Keeper] Polled State | Risk Score: ${globalState.lastRiskScore.toNumber()} | CB Active: ${globalState.circuitBreakerActive}`,
    );

    // If high risk and CB not active, we would normally trigger a proof here.
    // We'll mock the proof latency for Grafana metrics.
    if (
      globalState.lastRiskScore.toNumber() > 7000 &&
      !globalState.circuitBreakerActive
    ) {
      console.log(`[Keeper] High risk detected, generating proof...`);
      await simulateProofGeneration();
      console.log(`[Keeper] Proof generated (mock).`);
    }
  } catch (e: any) {
    if (e.message.includes("fetch failed")) {
      console.warn("[Keeper] RPC offline, cannot poll state.");
    } else if (e.message.includes("Account does not exist")) {
      console.warn("[Keeper] Global state account not initialized yet.");
    } else {
      console.error("[Keeper] Error polling risk state:", e.message);
    }
  }
}

// Start polling loop
setInterval(pollRiskState, 5000);
pollRiskState();

app.listen(port, () => {
  console.log(`Keeper service listening on port ${port}`);
  console.log(
    `Prometheus metrics available at http://localhost:${port}/metrics`,
  );
});
