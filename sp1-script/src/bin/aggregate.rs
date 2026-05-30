//! Public values aggregation scaffold.
//!
//! This does not produce a recursive proof. It computes a deterministic
//! aggregate hash over public values files to stage future recursion work.

use clap::Parser;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "panic-sp1-aggregate")]
struct Args {
    /// Input public_values.bin files
    #[arg(long, required = true)]
    inputs: Vec<PathBuf>,

    /// Output directory for aggregate artifacts
    #[arg(long)]
    output: PathBuf,
}

fn main() {
    let args = Args::parse();

    let mut hasher = Sha256::new();
    let mut manifest: Vec<String> = Vec::with_capacity(args.inputs.len());

    for input in &args.inputs {
        let bytes = fs::read(input).expect("failed to read public values file");
        hasher.update(&bytes);
        manifest.push(input.display().to_string());
    }

    let aggregate_hash = hasher.finalize();
    let hex_hash = hex::encode(aggregate_hash);

    fs::create_dir_all(&args.output).expect("failed to create output dir");
    fs::write(args.output.join("aggregate_hash.txt"), &hex_hash)
        .expect("failed to write aggregate_hash.txt");

    let manifest_json = serde_json::to_string_pretty(&manifest)
        .expect("failed to serialize manifest");
    fs::write(args.output.join("aggregate_manifest.json"), manifest_json)
        .expect("failed to write aggregate_manifest.json");

    println!("Aggregate hash: {}", hex_hash);
}
