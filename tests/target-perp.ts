import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";

describe("target-perp", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const targetProgram = anchor.workspace.TargetPerp as Program<any>;
  const riskProgram = anchor.workspace.ProofOfPanic as Program<any>;
  const wallet = provider.wallet;

  let perpStatePda: anchor.web3.PublicKey;
  let globalStatePda: anchor.web3.PublicKey;
  let riskConfigPda: anchor.web3.PublicKey;
  let positionBookPda: anchor.web3.PublicKey;

  before(async () => {
    [perpStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("perp_state")],
      targetProgram.programId
    );

    [globalStatePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      riskProgram.programId
    );
    [riskConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("risk_config")],
      riskProgram.programId
    );
    [positionBookPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("position_book")],
      riskProgram.programId
    );
  });

  it("Initializes target-perp", async () => {
    const info = await provider.connection.getAccountInfo(perpStatePda);
    if (!info) {
      await targetProgram.methods
        .initialize(new BN(10_000_000)) // 10x max leverage initially
        .accounts({
          authority: wallet.publicKey,
          perpState: perpStatePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    }

    const state = await targetProgram.account.perpState.fetch(perpStatePda);
    expect(state.maxLeverage.toNumber()).to.equal(10_000_000);
  });

  it("Applies circuit breaker when active in risk engine", async () => {
    await targetProgram.methods
      .applyCircuitBreaker()
      .accounts({
        perpState: perpStatePda,
        riskEngineState: globalStatePda,
      })
      .rpc();

    const state = await targetProgram.account.perpState.fetch(perpStatePda);
    expect(state.maxLeverage.toNumber()).to.equal(5_000_000); // 10x / 2
  });
});
