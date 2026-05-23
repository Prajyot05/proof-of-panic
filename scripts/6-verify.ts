/**
 * Proof of Panic — Submit Proof & Verify On-Chain
 *
 * Reads the generated proof and public inputs, submits them to the
 * submit_proof_and_verify instruction on-chain.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const IDL_PATH = resolve(__dirname, "../target/idl/proof_of_panic.json");
const KEYPAIR_PATH = resolve(
  process.env.HOME || "~",
  ".config/solana/id.json"
);
const RESULTS_PATH = resolve(
  __dirname,
  "../circuits/panic_proof/results.json"
);
const PROOF_PATH = resolve(
  __dirname,
  "../circuits/panic_proof/target/panic_proof.proof"
);
const PW_PATH = resolve(
  __dirname,
  "../circuits/panic_proof/target/panic_proof.pw"
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

  // Derive PDAs
  const [globalStatePda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("global_state")],
    programId
  );
  const [riskConfigPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("risk_config")],
    programId
  );
  const [positionBookPda] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position_book")],
    programId
  );

  // Read simulation results
  if (!existsSync(RESULTS_PATH)) {
    console.error("❌ results.json not found. Run the simulator first.");
    process.exit(1);
  }
  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

  // Read proof bytes (if available)
  let proofBytes = Buffer.alloc(0);
  let publicInputs = Buffer.alloc(0);

  if (existsSync(PROOF_PATH)) {
    proofBytes = readFileSync(PROOF_PATH);
    console.log(`Proof size: ${proofBytes.length} bytes`);
  } else {
    console.log(
      "⚠ Proof file not found — submitting with mock proof (test mode)"
    );
    // In test mode, we submit with empty proof. The program's test-mock-verify
    // feature will bypass the CPI verification.
    proofBytes = Buffer.alloc(388); // Mock 388-byte proof
  }

  if (existsSync(PW_PATH)) {
    publicInputs = readFileSync(PW_PATH);
  }

  // Extract values from results
  const riskScore = results.risk_score;
  const badDebt = results.total_bad_debt;
  const numLiquidated = results.num_liquidated;
  const stateHash: number[] = results.state_hash;

  console.log("");
  console.log("Submitting proof on-chain...");
  console.log(`  Risk Score: ${riskScore}`);
  console.log(`  Bad Debt: $${badDebt / 1_000_000}`);
  console.log(`  Liquidated: ${numLiquidated} positions`);
  console.log(
    `  State Hash: 0x${stateHash.map((b: number) => b.toString(16).padStart(2, "0")).join("")}`
  );
  console.log("");

  try {
    // Build the transaction with increased compute budget
    const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
    });

    const tx = await program.methods
      .submitProofAndVerify(
        Buffer.from(proofBytes),
        Buffer.from(publicInputs),
        new anchor.BN(riskScore),
        new anchor.BN(badDebt),
        new anchor.BN(numLiquidated),
        stateHash
      )
      .accounts({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        riskConfig: riskConfigPda,
        positionBook: positionBookPda,
      })
      .preInstructions([computeIx])
      .signers([wallet])
      .rpc();

    console.log(`✓ Proof submitted and verified on-chain (tx: ${tx.slice(0, 16)}...)`);

    // Read updated state
    const state = await (program.account as any).globalState.fetch(globalStatePda);
    const stateAny = state as any;

    console.log("");
    console.log(
      `Risk Score: ${Number(stateAny.lastRiskScore)} / 1,000,000 (${(Number(stateAny.lastRiskScore) / 10000).toFixed(1)}%)`
    );
    console.log(`Last Proof Slot: ${Number(stateAny.lastProofSlot)}`);

    if (stateAny.circuitBreakerActive) {
      console.log("");
      console.log("═══════════════════════════════════════════");
      console.log("⚠️  CIRCUIT BREAKER ACTIVATED");
      console.log(
        `   Max leverage reduced to ${Number(stateAny.maxLeverage) / 1_000_000}x`
      );
      console.log("═══════════════════════════════════════════");
    } else {
      console.log(
        "✓ Protocol is within safe parameters — no circuit breaker needed"
      );
    }
  } catch (err: any) {
    console.error("❌ Proof verification failed:", err.message);
    if (err.logs) {
      console.error("Program logs:");
      err.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    process.exit(1);
  }
}

main().catch(console.error);
