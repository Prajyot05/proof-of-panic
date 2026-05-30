//! SP1 Host Script for Proof of Panic
use sp1_sdk::{blocking::{ProverClient, Prover, ProveRequest}, SP1Stdin, include_elf, Elf, ProvingKey, HashableKey};
use sha2::{Digest, Sha256};
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

    #[arg(long, default_value_t = false)]
    cache: bool,
    
    #[arg(long)]
    output: Option<PathBuf>,
}

fn main() {
    sp1_sdk::utils::setup_logger();
    let args = Args::parse();

    // Read the snapshot
    let snapshot_json = fs::read_to_string(&args.snapshot).expect("Failed to read snapshot");
    let snapshot: Snapshot = serde_json::from_str(&snapshot_json).expect("Failed to parse snapshot");

    if args.cache {
        if let Some(output) = &args.output {
            let input_hash = compute_input_hash(&snapshot_json, args.shock_bps, args.shock_up);
            let hash_path = output.join("input_hash.txt");
            let proof_path = output.join("proof.bin");
            let public_values_path = output.join("public_values.bin");

            if hash_path.exists() && proof_path.exists() && public_values_path.exists() {
                let cached_hash = fs::read_to_string(&hash_path).unwrap_or_default();
                if cached_hash.trim() == input_hash {
                    println!("Using cached proof: {}", input_hash);
                    return;
                }
            }
        }
    }

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
        // Save public values separately (borsh-serialized by the guest)
        fs::write(output.join("public_values.bin"), bytes).unwrap();
        // Save the verification key
        fs::write(output.join("vkey.bin"), vk.bytes32()).unwrap();
        if args.cache {
            let input_hash = compute_input_hash(&snapshot_json, args.shock_bps, args.shock_up);
            fs::write(output.join("input_hash.txt"), input_hash).unwrap();
        }
        println!("Saved proof to {:?}", output);
    }
}

fn compute_input_hash(snapshot_json: &str, shock_bps: u64, shock_up: bool) -> String {
    let mut hasher = Sha256::new();
    hasher.update(snapshot_json.as_bytes());
    hasher.update(shock_bps.to_le_bytes());
    hasher.update([shock_up as u8]);
    hex::encode(hasher.finalize())
}
