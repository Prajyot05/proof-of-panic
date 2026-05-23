/**
 * Proof of Panic — Snapshot Protocol State
 *
 * Reads GlobalState, RiskConfig, and PositionBook from the local validator
 * and writes a JSON snapshot file for the simulator.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const IDL_PATH = resolve(__dirname, "../target/idl/proof_of_panic.json");
const KEYPAIR_PATH = resolve(
  process.env.HOME || "~",
  ".config/solana/id.json"
);
const OUTPUT_PATH = resolve(__dirname, "demo-snapshot.json");

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

  // Fetch accounts
  const globalState = await (program.account as any).globalState.fetch(globalStatePda);
  const riskConfig = await (program.account as any).riskConfig.fetch(riskConfigPda);

  // Read PositionBook raw bytes (zero-copy account)
  const positionBookAccountInfo =
    await connection.getAccountInfo(positionBookPda);
  if (!positionBookAccountInfo) {
    throw new Error("PositionBook account not found");
  }

  // Parse zero-copy layout:
  // Skip 8 bytes (Anchor discriminator)
  // 1 byte: count
  // 7 bytes: padding
  // Then 8 × 64 bytes: Position structs
  const data = positionBookAccountInfo.data;
  const count = data[8]; // first byte after discriminator
  const positions: any[] = [];

  for (let i = 0; i < count; i++) {
    const offset = 8 + 1 + 7 + i * 64; // discriminator + count + padding + i * position_size

    // Owner: 32 bytes
    const ownerBytes = data.slice(offset, offset + 32);
    const owner = Buffer.from(ownerBytes).toString("hex");

    // Collateral: u64 LE at offset+32
    const collateral = data.readBigUInt64LE(offset + 32);

    // Size: u64 LE at offset+40
    const size = data.readBigUInt64LE(offset + 40);

    // Entry price: u64 LE at offset+48
    const entryPrice = data.readBigUInt64LE(offset + 48);

    // is_long: u8 at offset+56
    const isLong = data[offset + 56] === 1;

    // is_open: u8 at offset+57
    const isOpen = data[offset + 57] === 1;

    positions.push({
      owner,
      collateral: Number(collateral),
      size: Number(size),
      entry_price: Number(entryPrice),
      is_long: isLong,
      is_open: isOpen,
    });
  }

  // Build snapshot
  const snapshot = {
    oracle_price: Number((globalState as any).oraclePrice),
    insurance_fund: Number((globalState as any).insuranceFund),
    positions,
    risk_config: {
      maintenance_margin_bps: Number(
        (riskConfig as any).maintenanceMarginBps
      ),
      liquidation_fee_bps: Number((riskConfig as any).liquidationFeeBps),
      circuit_breaker_threshold: Number(
        (riskConfig as any).circuitBreakerThreshold
      ),
      shock_magnitude_bps: Number((riskConfig as any).shockMagnitudeBps),
    },
  };

  // Write snapshot
  writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(
    `✓ Snapshot saved to ${OUTPUT_PATH} (${count} positions, price $${snapshot.oracle_price / 1_000_000})`
  );
}

main().catch(console.error);
