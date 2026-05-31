import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import idl from "./idl.json";
export { idl };
export declare const ProofOfPanicProgramId: anchor.web3.PublicKey;
export declare const PublicValuesLayout: any;
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
export declare class ProofOfPanicClient {
    program: Program<any>;
    provider: anchor.AnchorProvider;
    constructor(provider: anchor.AnchorProvider, programId?: PublicKey);
    getPDAs(): {
        globalStatePda: anchor.web3.PublicKey;
        riskConfigPda: anchor.web3.PublicKey;
        positionBookPda: anchor.web3.PublicKey;
        incentivesConfigPda: anchor.web3.PublicKey;
        rewardVaultPda: anchor.web3.PublicKey;
    };
    encodePublicValues(values: PublicValues): Buffer;
}
