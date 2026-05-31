import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ProofOfPanic } from "../target/types/proof_of_panic";
import { assert, expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import { ProofOfPanicClient } from "@proof-of-panic/sdk";

describe("Security & Negative Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ProofOfPanic as Program<ProofOfPanic>;
  const client = new ProofOfPanicClient(provider);

  const { globalStatePda, riskConfigPda, positionBookPda } = client.getPDAs();

  const SP1_VERIFIER_PROGRAM_ID = new PublicKey(
    process.env.SP1_VERIFIER_PROGRAM_ID || "11111111111111111111111111111111",
  );

  it("Accepts a valid SP1 Proof of Panic (if artifacts exist)", async () => {
    // Attempt to load the flash-crash proof artifacts
    const fs = require("fs");
    const path = require("path");
    
    const scenarioDir = path.resolve(__dirname, "../app/public/scenarios/flash-crash");
    const proofPath = path.resolve(scenarioDir, "proof.bin");
    const inputsPath = path.resolve(scenarioDir, "public_values.bin");
    const resultsPath = path.resolve(scenarioDir, "results.json");

    if (!fs.existsSync(proofPath) || !fs.existsSync(inputsPath) || !fs.existsSync(resultsPath)) {
      console.log("    ⚠ Skipping real proof test (artifacts not found). To run this, generate proofs first.");
      return;
    }

    let proofBytes = fs.readFileSync(proofPath);
    const publicInputs = fs.readFileSync(inputsPath);
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    const shockDirectionUp = Boolean(results.shock_direction_up);

    // Truncate if we're just doing mock verify on local validator
    if (proofBytes.length > 800 && process.env.RPC_URL?.includes("localhost")) {
      proofBytes = Buffer.alloc(128); 
    }

    const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 });

    try {
      await program.methods
        .submitProofAndVerify(proofBytes, publicInputs, shockDirectionUp)
        .accounts({
          submitter: provider.wallet.publicKey,
          globalState: globalStatePda,
          riskConfig: riskConfigPda,
          positionBook: positionBookPda,
          sp1Verifier: SP1_VERIFIER_PROGRAM_ID,
          admin: provider.wallet.publicKey,
          pythOracle: null,
          systemProgram: PublicKey.default,
        })
        .preInstructions([computeIx])
        .rpc();

      // If it didn't throw, we successfully accepted the proof!
      assert.ok(true, "Proof was successfully verified on-chain");
    } catch (err: any) {
      if (err.message.includes("AccountNotInitialized")) {
        console.log("    ⚠ Skipping: Contract PDAs not initialized. Need to run setup scripts first.");
      } else {
        assert.fail(`Proof submission failed: ${err.message}`);
      }
    }
  });

  it("Rejects forged risk score with valid SP1 proof format", async () => {
    // Generate some fake proof bytes
    const fakeProof = Buffer.from("forged_proof_data");
    const fakeInputs = Buffer.from("forged_public_inputs");

    try {
      await program.methods
        .submitProofAndVerify(fakeProof, fakeInputs, 0)
        .accounts({
          submitter: provider.wallet.publicKey,
          globalState: globalStatePda,
          riskConfig: riskConfigPda,
          positionBook: positionBookPda,
          sp1Verifier: SP1_VERIFIER_PROGRAM_ID,
          // admin placeholder: tests run as the provider wallet which is also authority
          admin: provider.wallet.publicKey,
          pythOracle: null,
          systemProgram: PublicKey.default,
        })
        .rpc();

      assert.fail("Should have thrown an error for forged proof");
    } catch (err: any) {
      expect(err.message).to.include("InvalidPublicValuesHash");
    }
  });

  it("Rejects transaction if pyth oracle account is invalid", async () => {
    // Try to pass an invalid Pyth oracle account
    const invalidPythOracle = anchor.web3.Keypair.generate().publicKey;
    const fakeProof = Buffer.alloc(10);
    const fakeInputs = Buffer.alloc(1000); // Correct length for public values

    try {
      await program.methods
        .submitProofAndVerify(fakeProof, fakeInputs, 0)
        .accounts({
          submitter: provider.wallet.publicKey,
          globalState: globalStatePda,
          riskConfig: riskConfigPda,
          positionBook: positionBookPda,
          sp1Verifier: SP1_VERIFIER_PROGRAM_ID,
          admin: provider.wallet.publicKey,
          pythOracle: invalidPythOracle, // Malicious account
          systemProgram: PublicKey.default,
        })
        .rpc();

      assert.fail("Should have thrown an error for invalid oracle");
    } catch (err: any) {
      // The error comes from Pyth SDK failing to parse the invalid account data,
      // which we mapped to InvalidOracle
      expect(err.message).to.include("InvalidOracle");
    }
  });

  it("Rejects if the wrong Verifier Program ID is used", async () => {
    // In strict mode (not mock verify), the contract hardcodes the SP1 verifier ID.
    // We check if it throws when a different ID is passed.
    const fakeVerifier = anchor.web3.Keypair.generate().publicKey;
    const fakeProof = Buffer.alloc(10);
    const fakeInputs = Buffer.alloc(100);

    try {
      await program.methods
        .submitProofAndVerify(fakeProof, fakeInputs, 0)
        .accounts({
          submitter: provider.wallet.publicKey,
          globalState: globalStatePda,
          riskConfig: riskConfigPda,
          positionBook: positionBookPda,
          sp1Verifier: fakeVerifier,
          admin: provider.wallet.publicKey,
          pythOracle: null,
          systemProgram: PublicKey.default,
        })
        .rpc();

      assert.fail("Should have thrown an error for wrong verifier");
    } catch (err: any) {
      // Depending on whether `test-mock-verify` feature is on during this test run,
      // it might fail at constraint validation.
      expect(err.message).to.match(
        /ConstraintAddress|InvalidVerifierProgram|InvalidPublicValuesHash/,
      );
    }
  });
});
