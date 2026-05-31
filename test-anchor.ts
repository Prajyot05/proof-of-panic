import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { ProofOfPanicClient } from "@proof-of-panic/sdk";

async function run() {
  const connection = new Connection("http://127.0.0.1:8899");
  const wallet = new NodeWallet(Keypair.generate());
  const provider = new AnchorProvider(connection, wallet, {});
  const client = new ProofOfPanicClient(provider);

  const proofBytes = Buffer.alloc(388);
  const publicInputsBuf = Buffer.alloc(113);
  const shockDirectionUp = true;
  const pdas = client.getPDAs();

  try {
    const tx = await (client.program as any).methods
      .submitProofAndVerify(proofBytes, publicInputsBuf, shockDirectionUp)
      .accounts({
        submitter: wallet.publicKey,
        globalState: pdas.globalStatePda,
        riskConfig: pdas.riskConfigPda,
        positionBook: pdas.positionBookPda,
        sp1Verifier: PublicKey.default,
        admin: wallet.publicKey,
        pythOracle: null,
        systemProgram: PublicKey.default,
      })
      .transaction();
    console.log("Success! TX size:", tx.serialize({requireAllSignatures: false}).length);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
