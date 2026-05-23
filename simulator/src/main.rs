//! Proof of Panic — Off-chain Deterministic Simulator
//!
//! Reads a JSON snapshot of on-chain protocol state, applies a market shock,
//! computes the liquidation cascade, and outputs Noir witness files.
//!
//! USAGE:
//!   panic-simulator --snapshot <path> --output <dir> [--shock-bps 3000]

mod commitment;
mod liquidation;
mod shock;
mod solvency;
mod types;
mod witness;

use std::path::PathBuf;

use clap::Parser;

use crate::commitment::compute_state_hash;
use crate::liquidation::evaluate_positions;
use crate::shock::apply_shock;
use crate::solvency::compute_solvency;
use crate::types::*;

#[derive(Parser, Debug)]
#[command(name = "panic-simulator")]
#[command(about = "Off-chain stress-test simulator for Proof of Panic")]
struct Args {
    /// Path to the JSON snapshot file
    #[arg(short, long)]
    snapshot: PathBuf,

    /// Output directory for Prover.toml, Verifier.toml, and results.json
    #[arg(short, long)]
    output: PathBuf,

    /// Shock magnitude in basis points (default: from snapshot risk_config)
    #[arg(long)]
    shock_bps: Option<u64>,
}

fn main() {
    let args = Args::parse();

    // ── Read snapshot ──
    let snapshot_str =
        std::fs::read_to_string(&args.snapshot).expect("Failed to read snapshot file");
    let snapshot: Snapshot =
        serde_json::from_str(&snapshot_str).expect("Failed to parse snapshot JSON");

    let shock_bps = args
        .shock_bps
        .unwrap_or(snapshot.risk_config.shock_magnitude_bps);

    println!("══════════════════════════════════════");
    println!(" PROOF OF PANIC — Adversarial Simulation");
    println!("══════════════════════════════════════");
    println!();

    // ── Apply shock ──
    let pre_shock_price = snapshot.oracle_price;
    let post_shock_price = apply_shock(pre_shock_price, shock_bps);

    println!(
        "⚡ Shock: SOL -{}.{}% (${}.{:02} → ${}.{:02})",
        shock_bps / 100,
        shock_bps % 100,
        pre_shock_price / SCALE,
        (pre_shock_price % SCALE) / (SCALE / 100),
        post_shock_price / SCALE,
        (post_shock_price % SCALE) / (SCALE / 100),
    );
    println!();

    // ── Evaluate positions ──
    let position_results = evaluate_positions(
        &snapshot.positions,
        post_shock_price,
        snapshot.risk_config.maintenance_margin_bps,
    );

    println!("Position Results:");
    for (i, (pos, res)) in snapshot
        .positions
        .iter()
        .zip(position_results.iter())
        .enumerate()
    {
        let direction = if pos.is_long { "LONG" } else { "SHORT" };
        let leverage = pos.size / pos.collateral;
        let pnl_sign = if res.unrealized_pnl < 0 { "-" } else { "+" };
        let pnl_abs = res.unrealized_pnl.unsigned_abs();
        let status = if res.is_liquidated {
            "⚠ LIQUIDATED"
        } else {
            "✓ SAFE"
        };

        println!(
            "  #{} {} {}x:  PnL {}${}.{:02}  Margin {}.{}%  {}",
            i,
            direction,
            leverage,
            pnl_sign,
            pnl_abs / SCALE,
            (pnl_abs % SCALE) / (SCALE / 100),
            res.margin_ratio_bps / 100,
            res.margin_ratio_bps % 100,
            status,
        );
    }

    // ── Compute solvency ──
    let num_liquidated = position_results.iter().filter(|r| r.is_liquidated).count() as u64;
    let total_losses: u64 = position_results.iter().map(|r| r.liquidation_loss).sum();

    let (insurance_remaining, bad_debt, risk_score, protocol_solvent) =
        compute_solvency(&position_results, snapshot.insurance_fund, &snapshot.positions);

    println!();
    println!(
        "Liquidations: {}/{}",
        num_liquidated,
        snapshot.positions.len()
    );
    println!("Total Losses: ${}.{:02}", total_losses / SCALE, (total_losses % SCALE) / (SCALE / 100));
    println!(
        "Insurance Remaining: ${}.{:02}",
        insurance_remaining / SCALE,
        (insurance_remaining % SCALE) / (SCALE / 100),
    );
    println!("Bad Debt: ${}.{:02}", bad_debt / SCALE, (bad_debt % SCALE) / (SCALE / 100));
    println!(
        "Risk Score: {}.{}%{}",
        risk_score * 100 / RISK_SCORE_MAX,
        (risk_score * 10000 / RISK_SCORE_MAX) % 100,
        if protocol_solvent {
            " (protocol solvent)"
        } else {
            " ⚠ PROTOCOL INSOLVENT"
        },
    );

    // ── Compute state hash ──
    let state_hash = compute_state_hash(&snapshot.positions);
    println!();
    println!(
        "State Hash: 0x{}",
        state_hash
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>()
    );

    // ── Build result ──
    let result = SimResult {
        pre_shock_price,
        post_shock_price,
        shock_bps,
        position_results,
        num_liquidated,
        total_losses,
        insurance_fund_remaining: insurance_remaining,
        total_bad_debt: bad_debt,
        risk_score,
        protocol_solvent,
        state_hash,
    };

    // ── Write outputs ──
    std::fs::create_dir_all(&args.output).expect("Failed to create output directory");

    // Write results JSON (for frontend consumption)
    let results_json = serde_json::to_string_pretty(&result).expect("Failed to serialize results");
    std::fs::write(args.output.join("results.json"), results_json)
        .expect("Failed to write results.json");

    // Write Noir witness files
    witness::write_witness_files(&args.output, &snapshot, &result)
        .expect("Failed to write witness files");

    println!();
    println!("✓ Witness written to {}/Prover.toml", args.output.display());
    println!(
        "✓ Public inputs written to {}/Verifier.toml",
        args.output.display()
    );
    println!(
        "✓ Results written to {}/results.json",
        args.output.display()
    );
}
