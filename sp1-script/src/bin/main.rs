//! SP1 Host Script for Proof of Panic
use sp1_sdk::{blocking::{ProverClient, Prover, ProveRequest}, SP1Stdin, include_elf, Elf, ProvingKey, HashableKey};
use std::fs;
use std::path::PathBuf;
use clap::Parser;
use panic_simulator::types::Snapshot;

// The ELF we want to execute inside the zkVM.
const ELF: Elf = include_elf!("panic-sp1-program");

#[derive(Parser, Debug)]
#[command(name = "panic-sp1-script")]
struct Args {
    #[arg(long)]
    snapshot: PathBuf,

    #[arg(long, default_value = "3000")]
    shock_bps: u64,

    #[arg(long)]
    shock_up: bool,
    
    #[arg(long)]
    output: Option<PathBuf>,
}

fn main() {
    sp1_sdk::utils::setup_logger();
    let args = Args::parse();

    // Read the snapshot
    let snapshot_json = fs::read_to_string(&args.snapshot).expect("Failed to read snapshot");
    let snapshot: Snapshot = serde_json::from_str(&snapshot_json).expect("Failed to parse snapshot");

    // Setup the prover client.
    let client = ProverClient::from_env();

    // Setup the inputs.
    let mut stdin = SP1Stdin::new();
    stdin.write(&snapshot);
    stdin.write(&args.shock_bps);
    stdin.write(&args.shock_up);

    println!("Generating proof...");
    
    // Generate the proof (using the default prover, which is usually fast enough for small programs locally)
    let pk = client.setup(ELF).expect("failed to setup elf");
    // Generate Groth16 proof
    let proof = client.prove(&pk, stdin).groth16().run().expect("failed to generate proof");

    println!("Successfully generated proof!");
    
    // Verify proof
    let vk = pk.verifying_key();
    client.verify(&proof, vk, None).expect("failed to verify proof");
    
    println!("Proof verified!");
    
    // Read the public values
    let bytes = proof.public_values.as_slice();
    println!("Public values (hex): {}", hex::encode(bytes));
    
    if let Some(output) = args.output {
        fs::create_dir_all(&output).unwrap();
        // Save the proof bytes
        let proof_bytes = bincode::serialize(&proof).unwrap();
        fs::write(output.join("proof.bin"), proof_bytes).unwrap();
        // Save the verification key
        fs::write(output.join("vkey.bin"), vk.bytes32()).unwrap();
        println!("Saved proof to {:?}", output);
    }
}
