import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as borsh from "@coral-xyz/borsh";
import idl from "./idl.json";

export { idl };

export const ProofOfPanicProgramId = new PublicKey("9YGU7h7TCskUQ2BkZfSVCkb66NzJPES5m5QrW8vUw6hE");

export const PublicValuesLayout = borsh.struct([
  borsh.array(borsh.u8(), 32, "stateHash"),
  borsh.u32("schemaVersion"),
  borsh.u64("preShockPrice"),
  borsh.u64("postShockPrice"),
  borsh.u64("shockBps"),
  borsh.u8("shockDirectionUp"),
  borsh.u64("maintenanceMarginBps"),
  borsh.u64("liquidationFeeBps"),
  borsh.u64("liquidationTargetMarginBps"),
  borsh.u64("circuitBreakerThreshold"),
  borsh.u64("insuranceFund"),
  borsh.u64("badDebt"),
  borsh.u64("riskScore"),
  borsh.u64("numLiquidated"),
]);

export interface PublicValues {
  stateHash: number[];
  schemaVersion: number;
  preShockPrice: BN;
  postShockPrice: BN;
  shockBps: BN;
  shockDirectionUp: number;
  maintenanceMarginBps: BN;
  liquidationFeeBps: BN;
  liquidationTargetMarginBps: BN;
  circuitBreakerThreshold: BN;
  insuranceFund: BN;
  badDebt: BN;
  riskScore: BN;
  numLiquidated: BN;
}

export class ProofOfPanicClient {
  public program: Program<any>;
  public provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider, programId: PublicKey = ProofOfPanicProgramId) {
    this.provider = provider;
    this.program = new Program(idl as any, provider);
  }

  public getPDAs() {
    const programId = this.program.programId;
    const [globalStatePda] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], programId);
    const [riskConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("risk_config")], programId);
    const [positionBookPda] = PublicKey.findProgramAddressSync([Buffer.from("position_book")], programId);
    const [incentivesConfigPda] = PublicKey.findProgramAddressSync([Buffer.from("incentives_config")], programId);
    const [rewardVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("reward_vault")], programId);
    
    return {
      globalStatePda,
      riskConfigPda,
      positionBookPda,
      incentivesConfigPda,
      rewardVaultPda
    };
  }
  
  public encodePublicValues(values: PublicValues): Buffer {
    const buffer = Buffer.alloc(1000);
    const len = PublicValuesLayout.encode(values, buffer);
    return buffer.slice(0, len);
  }
}
