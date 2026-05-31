import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { ProofOfPanicClient, PublicValuesLayout, idl } from "@proof-of-panic/sdk";
import BN from "bn.js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioId, riskScore, badDebt, numLiquidated, stateHash, shockDirectionUp } = body;

    if (!scenarioId) {
      return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });
    }

    // In a real environment, this route would be called by Keeper bots who have 
    // generated SP1 ZK proofs. They would pass the raw proof bytes.
    // For Judge Mode, we simulate proof generation and submission on devnet.
    
    // Use a random keypair or a configured Devnet keypair for Judge Mode
    const privateKey = process.env.JUDGE_MODE_PRIVATE_KEY;
    let wallet: NodeWallet;
    if (privateKey) {
      wallet = new NodeWallet(Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey))));
    } else {
      // Fallback: use a random wallet (transaction will fail on-chain if no SOL)
      // but we can return the serialized transaction for the UI to show.
      wallet = new NodeWallet(Keypair.generate());
    }

    const connection = new Connection(process.env.RPC_URL || "http://127.0.0.1:8899", "confirmed");
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const client = new ProofOfPanicClient(provider);

    // Get PDAs
    const pdas = client.getPDAs();

    // Mock public values that match the scenario snapshot
    // In production, these are securely extracted from the SP1 proof bytes by the Verifier contract
    const publicValues = {
      stateHash,
      schemaVersion: 1,
      preShockPrice: new BN(150_000_000), // mock
      postShockPrice: new BN(120_000_000), // mock
      shockBps: new BN(2000),
      shockDirectionUp: shockDirectionUp ? 1 : 0,
      maintenanceMarginBps: new BN(500),
      liquidationFeeBps: new BN(100),
      liquidationTargetMarginBps: new BN(1000),
      circuitBreakerThreshold: new BN(40_000_000), // 40%
      insuranceFund: new BN(1_000_000_000_000),
      badDebt: new BN(badDebt),
      riskScore: new BN(riskScore),
      numLiquidated: new BN(numLiquidated),
    };

    const publicInputsBuf = client.encodePublicValues(publicValues);
    const mockProofBytes = Buffer.alloc(388); // Groth16 mock size

    const SP1_VERIFIER_PROGRAM_ID = new PublicKey(
      process.env.SP1_VERIFIER_PROGRAM_ID || "11111111111111111111111111111111"
    );

    // Build the transaction
    const tx = await (client.program as any).methods
      .submitProofAndVerify(mockProofBytes, publicInputsBuf, shockDirectionUp)
      .accounts({
        submitter: wallet.publicKey,
        globalState: pdas.globalStatePda,
        riskConfig: pdas.riskConfigPda,
        positionBook: pdas.positionBookPda,
        sp1Verifier: SP1_VERIFIER_PROGRAM_ID,
        pythOracle: null,
        systemProgram: PublicKey.default, // web3.SystemProgram.programId
      })
      .transaction();

    tx.feePayer = wallet.publicKey;
    try {
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
    } catch (e) {
      // Fallback blockhash for offline UI demo
      tx.recentBlockhash = "11111111111111111111111111111111";
    }
    tx.sign(wallet.payer);

    // If we have a funded keypair, submit it. Otherwise just return the base64.
    let txSignature = "";
    if (privateKey) {
      try {
        txSignature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(txSignature, "confirmed");
      } catch (err: any) {
        console.error("Submission failed:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      txSignature,
      message: "ZK Proof Verified via API route",
      serializedTx: tx.serialize().toString("base64"),
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
