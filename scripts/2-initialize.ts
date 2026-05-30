/**
 * Proof of Panic — Initialize Protocol + Positions
 *
 * Calls initialize_protocol and initialize_positions on-chain.
 * Assumes the program is already deployed.
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
  // Setup provider
  const connection = new web3.Connection("http://localhost:8899", "confirmed");
  const keypairData = JSON.parse(readFileSync(KEYPAIR_PATH, "utf-8"));
  const wallet = web3.Keypair.fromSecretKey(Uint8Array.from(keypairData));
  const provider = new AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  // Load IDL and program
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf-8"));
  const program = new Program(idl, provider);

  const programId = program.programId;
  console.log(`Program ID: ${programId.toBase58()}`);

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

  console.log("");
  console.log("PDA Addresses:");
  console.log(`  GlobalState:  ${globalStatePda.toBase58()}`);
  console.log(`  RiskConfig:   ${riskConfigPda.toBase58()}`);
  console.log(`  PositionBook: ${positionBookPda.toBase58()}`);
  console.log("");

  // Check if already initialized
  const globalStateInfo = await connection.getAccountInfo(globalStatePda);
  if (globalStateInfo) {
    console.log("⚠ Protocol already initialized — skipping initialization");
  } else {
    // Initialize protocol
    console.log("Initializing protocol...");
    const initTx = await program.methods
      .initializeProtocol()
      .accounts({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        riskConfig: riskConfigPda,
        positionBook: positionBookPda,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log(`✓ Protocol initialized (tx: ${initTx.slice(0, 16)}...)`);
  }

  // Check if positions already exist
  const globalState = await (program.account as any).globalState.fetch(globalStatePda);
  if ((globalState as any).totalPositions > 0) {
    console.log("⚠ Positions already initialized — skipping");
  } else {
    // Initialize positions
    console.log("Initializing demo positions...");
    const posTx = await program.methods
      .initializePositions()
      .accounts({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        positionBook: positionBookPda,
      })
      .signers([wallet])
      .rpc();
    console.log(`✓ 5 demo positions created (tx: ${posTx.slice(0, 16)}...)`);
  }

  // Display current state
  console.log("");
  const state = await (program.account as any).globalState.fetch(globalStatePda);
  const config = await (program.account as any).riskConfig.fetch(riskConfigPda);

  console.log("Protocol State:");
  console.log(
    `  Oracle Price:       $${Number((state as any).oraclePrice) / 1_000_000}`
  );
  console.log(
    `  Insurance Fund:     $${(Number((state as any).insuranceFund) / 1_000_000).toLocaleString()}`
  );
  console.log(
    `  Max Leverage:       ${Number((state as any).maxLeverage) / 1_000_000}x`
  );
  console.log(`  Total Positions:    ${(state as any).totalPositions}`);
  console.log(
    `  Circuit Breaker:    ${(state as any).circuitBreakerActive ? "🔴 ACTIVE" : "🟢 OFF"}`
  );
  console.log("");
  console.log("Risk Config:");
  console.log(
    `  Maintenance Margin: ${Number((config as any).maintenanceMarginBps) / 100}%`
  );
  console.log(
    `  Liquidation Fee:    ${Number((config as any).liquidationFeeBps) / 100}%`
  );
  console.log(
    `  Target Margin:      ${Number((config as any).liquidationTargetMarginBps) / 100}%`
  );
  console.log(
    `  CB Threshold:       ${Number((config as any).circuitBreakerThreshold) / 10000}%`
  );
  console.log(
    `  Shock Magnitude:    ${Number((config as any).shockMagnitudeBps) / 100}%`
  );
}

main().catch(console.error);
