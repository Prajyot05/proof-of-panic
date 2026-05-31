import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";
import * as borsh from "@coral-xyz/borsh";
import { createHash } from "crypto";

const PublicValuesLayout = borsh.struct([
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

describe("proof-of-panic", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.ProofOfPanic as Program<any>;
  const wallet = provider.wallet;

  let globalStatePda: anchor.web3.PublicKey;
  let riskConfigPda: anchor.web3.PublicKey;
  let positionBookPda: anchor.web3.PublicKey;
  let incentivesConfigPda: anchor.web3.PublicKey;
  let rewardVaultPda: anchor.web3.PublicKey;

  before(async () => {
    [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      program.programId,
    );
    [riskConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("risk_config")],
      program.programId,
    );
    [positionBookPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position_book")],
      program.programId,
    );
    [incentivesConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("incentives_config")],
      program.programId,
    );
    [rewardVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault")],
      program.programId,
    );
  });

  it("Initializes the protocol", async () => {
    const globalStateInfo =
      await provider.connection.getAccountInfo(globalStatePda);
    if (globalStateInfo) {
      console.log("Protocol already initialized");
      return;
    }
    await program.methods
      .initializeProtocol()
      .accounts({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        riskConfig: riskConfigPda,
        positionBook: positionBookPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.globalState.fetch(globalStatePda);
    expect((state as any).totalPositions).to.equal(0);
    expect((state as any).circuitBreakerActive).to.be.false;
  });

  it("Initializes incentives", async () => {
    const incentivesInfo =
      await provider.connection.getAccountInfo(incentivesConfigPda);
    if (incentivesInfo) return;
    await program.methods
      .initializeIncentives(new BN(50_000_000), new BN(10), true)
      .accounts({
        authority: wallet.publicKey,
        incentivesConfig: incentivesConfigPda,
        rewardVault: rewardVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundRewardVault(new BN(1_000_000_000))
      .accounts({
        funder: wallet.publicKey,
        rewardVault: rewardVaultPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  });

  it("Initializes positions", async () => {
    const state = await program.account.globalState.fetch(globalStatePda);
    if (Number((state as any).totalPositions) > 0) return;
    await program.methods
      .initializePositions()
      .accounts({
        authority: wallet.publicKey,
        globalState: globalStatePda,
        positionBook: positionBookPda,
      })
      .rpc();

    const postState = await program.account.globalState.fetch(globalStatePda);
    expect(Number((postState as any).totalPositions)).to.equal(5);
  });

  it("Submits proof and activates circuit breaker", async () => {
    const positionBook =
      await program.account.positionBook.fetch(positionBookPda);
    // Since Anchor deserializes the struct, we can't get the raw bytes directly without fetching the account info
    const accountInfo =
      await provider.connection.getAccountInfo(positionBookPda);
    // Remove the 8 byte discriminator
    const dataBytes = accountInfo!.data.slice(8);
    // The state hash is SHA256 of the positions slice
    // PositionBook has `positions: [Position; 8]` which is 64 * 8 = 512 bytes.
    // The discriminator is 8 bytes, count+padding is 8 bytes. Total offset = 16.
    const positionsBytes = accountInfo!.data.slice(16, 16 + 512);
    const hash = createHash("sha256").update(positionsBytes).digest();

    const state = await program.account.globalState.fetch(globalStatePda);
    const config = await program.account.riskConfig.fetch(riskConfigPda);

    const publicValues = {
      stateHash: Array.from(hash),
      schemaVersion: 1,
      preShockPrice: state.oraclePrice,
      postShockPrice: new BN(
        (state.oraclePrice.toNumber() *
          (10000 - config.shockMagnitudeBps.toNumber())) /
          10000,
      ),
      shockBps: config.shockMagnitudeBps,
      shockDirectionUp: 0,
      maintenanceMarginBps: config.maintenanceMarginBps,
      liquidationFeeBps: config.liquidationFeeBps,
      liquidationTargetMarginBps: config.liquidationTargetMarginBps,
      circuitBreakerThreshold: config.circuitBreakerThreshold,
      insuranceFund: state.insuranceFund,
      badDebt: new BN(0),
      riskScore: new BN(config.circuitBreakerThreshold.toNumber() + 100), // Exceed threshold
      numLiquidated: new BN(2),
    };

    const buffer = Buffer.alloc(1000);
    const len = PublicValuesLayout.encode(publicValues, buffer);
    const publicValuesBytes = buffer.slice(0, len);

    const proofBytes = Buffer.from("mock_proof_data");

    // Using test-mock-verify feature, SP1_VERIFIER isn't strictly checked via CPI,
    // but the pubkey is still needed in the accounts list.
    // Wait, the account is CHECK: SP1 Verifier Program (Strictly Enforced) with address = SUNSPOT_VERIFIER_PROGRAM_ID.
    // We need to pass the same pubkey. We can use program.programId for the test or create one if it doesn't matter since we'll mock verify.
    // Let's pass the default SUNSPOT_VERIFIER_PROGRAM_ID which is 11111111111111111111111111111111 (system program) or [0;32].
    // Wait, SUNSPOT_VERIFIER_PROGRAM_ID is defined in constants.rs.
    // pub const SUNSPOT_VERIFIER_PROGRAM_ID: Pubkey = Pubkey::new_from_array([0; 32]);
    const sp1Verifier = new anchor.web3.PublicKey(new Uint8Array(32));

    await program.methods
      .submitProofAndVerify(proofBytes, publicValuesBytes, false)
      .accounts({
        submitter: wallet.publicKey,
        globalState: globalStatePda,
        riskConfig: riskConfigPda,
        positionBook: positionBookPda,
        sp1Verifier: sp1Verifier,
        admin: wallet.publicKey,
        pythOracle: null,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const finalState = await program.account.globalState.fetch(globalStatePda);
    expect((finalState as any).circuitBreakerActive).to.be.true;
  });

  it("Rejects stale proofs and re-triggering", async () => {
    const accountInfo =
      await provider.connection.getAccountInfo(positionBookPda);
    const positionsBytes = accountInfo!.data.slice(16, 16 + 512);
    const hash = createHash("sha256").update(positionsBytes).digest();

    const state = await program.account.globalState.fetch(globalStatePda);
    const config = await program.account.riskConfig.fetch(riskConfigPda);

    const publicValues = {
      stateHash: Array.from(hash),
      schemaVersion: 1,
      preShockPrice: state.oraclePrice,
      postShockPrice: new BN(
        (state.oraclePrice.toNumber() *
          (10000 - config.shockMagnitudeBps.toNumber())) /
          10000,
      ),
      shockBps: config.shockMagnitudeBps,
      shockDirectionUp: 0,
      maintenanceMarginBps: config.maintenanceMarginBps,
      liquidationFeeBps: config.liquidationFeeBps,
      liquidationTargetMarginBps: config.liquidationTargetMarginBps,
      circuitBreakerThreshold: config.circuitBreakerThreshold,
      insuranceFund: state.insuranceFund,
      badDebt: new BN(0),
      riskScore: new BN(config.circuitBreakerThreshold.toNumber() + 100),
      numLiquidated: new BN(2),
    };

    const buffer = Buffer.alloc(1000);
    const len = PublicValuesLayout.encode(publicValues, buffer);
    const publicValuesBytes = buffer.slice(0, len);

    const proofBytes = Buffer.from("mock_proof_data");
    const sp1Verifier = new anchor.web3.PublicKey(new Uint8Array(32));

    try {
      await program.methods
        .submitProofAndVerify(proofBytes, publicValuesBytes, false)
        .accounts({
          submitter: wallet.publicKey,
          globalState: globalStatePda,
          riskConfig: riskConfigPda,
          positionBook: positionBookPda,
          sp1Verifier: sp1Verifier,
          admin: wallet.publicKey,
          pythOracle: null,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown error due to proof age");
    } catch (err: any) {
      expect(err.message).to.include("ProofTooFresh");
    }
  });
});
