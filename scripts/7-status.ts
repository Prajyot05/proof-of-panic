/**
 * Proof of Panic — Display Final Protocol State
 *
 * Reads and displays the complete protocol state after proof verification.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { readFileSync } from "fs";
import { resolve } from "path";

const IDL_PATH = resolve(__dirname, "../target/idl/proof_of_panic.json");
const KEYPAIR_PATH = resolve(
  process.env.HOME || "~",
  ".config/solana/id.json"
);

async function main() {
  const connection = new web3.Connection("http://localhost:8899", "confirmed");
  const keypairData = JSON.parse(readFileSync(KEYPAIR_PATH, "utf-8"));
  const wallet = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const provider = new AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  const idl = JSON.parse(readFileSync(IDL_PATH, "utf-8"));
  const program = new Program(idl, provider);
  const programId = program.programId;

  const [globalStatePda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );
  const [riskConfigPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("risk_config")],
    programId
  );

  const state = await (program.account as any).globalState.fetch(globalStatePda);
  const config = await (program.account as any).riskConfig.fetch(riskConfigPda);
  const stateAny = state as any;
  const configAny = config as any;

  const riskScore = Number(stateAny.lastRiskScore);
  const riskPct = (riskScore / 10000).toFixed(1);
  const maxLeverage = Number(stateAny.maxLeverage) / 1_000_000;
  const insuranceFund = Number(stateAny.insuranceFund) / 1_000_000;
  const cbActive = stateAny.circuitBreakerActive;
  const lastSlot = Number(stateAny.lastProofSlot);
  const stateHash: number[] = Array.from(stateAny.lastStateHash || []);
  const hashHex = stateHash
    .map((b: number) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log("");
  console.log("══════════════════════════════════════");
  console.log(" PROOF OF PANIC — Final Protocol State");
  console.log("══════════════════════════════════════");
  console.log("");
  console.log(
    `  Circuit Breaker:    ${cbActive ? "🔴 ACTIVE" : "🟢 OFF"}`
  );
  console.log(`  Risk Score:         ${riskPct}%`);
  console.log(`  Max Leverage:       ${maxLeverage}x`);
  console.log(
    `  Insurance Fund:     $${insuranceFund.toLocaleString()}`
  );
  console.log(`  Last Proof Slot:    #${lastSlot}`);
  console.log(`  Last State Hash:    0x${hashHex.slice(0, 16)}...`);
  console.log("");

  if (cbActive) {
    console.log(
      "  The protocol detected adversarial conditions"
    );
    console.log(
      "  and autonomously reduced risk exposure."
    );
  } else {
    console.log(
      "  The protocol is operating within safe parameters."
    );
  }

  console.log("");
  console.log("  ✓ Proof of Panic complete.");
  console.log("");
}

main().catch(console.error);
