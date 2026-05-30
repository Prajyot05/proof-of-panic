//! Proof of Panic — Off-chain Deterministic Simulator
//!
//! Reads a JSON snapshot of on-chain protocol state (or uses a built-in scenario),
//! applies a market shock, computes the liquidation cascade, and outputs
//! Noir witness files and a results JSON.
//!
//! USAGE:
//!   panic-simulator --snapshot <path> --output <dir> [--shock-bps 3000]
//!   panic-simulator --scenario volatility-shock --output <dir>
//!   panic-simulator --list-scenarios

use std::path::PathBuf;

use clap::Parser;

use panic_simulator::commitment::compute_state_hash;
use panic_simulator::liquidation::evaluate_positions;
use panic_simulator::scenarios::{get_scenario, list_scenarios, scenario_to_snapshot};
use panic_simulator::shock::apply_shock;
use panic_simulator::solvency::compute_solvency;
use panic_simulator::types::*;

#[derive(Parser, Debug)]
#[command(name = "panic-simulator")]
#[command(about = "Off-chain stress-test simulator for Proof of Panic")]
struct Args {
    /// Path to the JSON snapshot file (mutually exclusive with --scenario)
    #[arg(short, long)]
    snapshot: Option<PathBuf>,

    /// Use a built-in scenario instead of a snapshot file
    #[arg(long)]
    scenario: Option<String>,

    /// List all available built-in scenarios and exit
    #[arg(long)]
    list_scenarios: bool,

    /// Output directory for Prover.toml, Verifier.toml, and results.json
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Shock magnitude in basis points (default: from snapshot/scenario risk_config)
    #[arg(long)]
    shock_bps: Option<u64>,

    /// For short-squeeze scenario: apply shock as a price RISE instead of drop
    #[arg(long)]
    shock_up: bool,
}

fn main() {
    let args = Args::parse();

    // Handle --list-scenarios
    if args.list_scenarios {
        println!("Available scenarios:");
        for name in list_scenarios() {
            let s = get_scenario(name).unwrap();
            println!("  {:<22} {}", name, s.description);
        }
        return;
    }

    // Load snapshot from file or scenario
    let (snapshot, shock_direction_up) = if let Some(scenario_name) = &args.scenario {
        let scenario = get_scenario(scenario_name)
            .unwrap_or_else(|| {
                eprintln!("Unknown scenario: {}", scenario_name);
                eprintln!("Available scenarios:");
                for name in list_scenarios() {
                    eprintln!("  {}", name);
                }
                std::process::exit(1);
            });
        println!("Scenario: {} — {}", scenario.name, scenario.description);
        let is_up = scenario_name == "short-squeeze" || args.shock_up;
        (scenario_to_snapshot(&scenario), is_up)
    } else if let Some(snapshot_path) = &args.snapshot {
        let snapshot_str =
            std::fs::read_to_string(snapshot_path).expect("Failed to read snapshot file");
        let snapshot: Snapshot =
            serde_json::from_str(&snapshot_str).expect("Failed to parse snapshot JSON");
        (snapshot, args.shock_up)
    } else {
        eprintln!("Either --snapshot <path> or --scenario <name> is required.");
        eprintln!("Use --list-scenarios to see available scenarios.");
        std::process::exit(1);
    };

    let output_dir = args.output.unwrap_or_else(|| {
        eprintln!("--output <dir> is required.");
        std::process::exit(1);
    });

    let shock_bps = args
        .shock_bps
        .unwrap_or(snapshot.risk_config.shock_magnitude_bps);

    println!("══════════════════════════════════════");
    println!(" PROOF OF PANIC — Adversarial Simulation");
    println!("══════════════════════════════════════");
    println!();

    // ── Apply shock ──
    let pre_shock_price = snapshot.oracle_price;
    let post_shock_price = if shock_direction_up {
        apply_shock_up(pre_shock_price, shock_bps)
    } else {
        apply_shock(pre_shock_price, shock_bps)
    };

    let direction = if shock_direction_up { "+" } else { "-" };
    println!(
        "⚡ Shock: SOL {}{}.{}% (${}.{:02} → ${}.{:02})",
        direction,
        shock_bps / 100,
        shock_bps % 100,
        pre_shock_price / SCALE,
        (pre_shock_price % SCALE) / (SCALE / 100),
        post_shock_price / SCALE,
        (post_shock_price % SCALE) / (SCALE / 100),
    );
    println!();

    // ── Evaluate positions ──
    let mut positions = snapshot.positions.clone();
    let (position_results, final_post_shock_price) = evaluate_positions(
        &mut positions,
        post_shock_price,
        &snapshot.risk_config,
    );

    println!("Position Results:");
    for (i, (pos, res)) in snapshot
        .positions
        .iter()
        .zip(position_results.iter())
        .enumerate()
    {
        let direction = if pos.is_long { "LONG" } else { "SHORT" };
        let leverage = if pos.collateral > 0 {
            pos.size / pos.collateral
        } else {
            0
        };
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

    let (insurance_remaining, bad_debt, risk_score, protocol_solvent, total_fees) =
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

    // ── Output Final SimResult ──
    let result = SimResult {
        pre_shock_price: snapshot.oracle_price,
        post_shock_price: final_post_shock_price,
        shock_bps,
        shock_direction_up,
        position_results,
        num_liquidated,
        total_losses,
        total_fees_collected: total_fees,
        insurance_fund_remaining: insurance_remaining,
        total_bad_debt: bad_debt,
        risk_score,
        protocol_solvent,
        state_hash,
    };

    // ── Write outputs ──
    std::fs::create_dir_all(&output_dir).expect("Failed to create output directory");

    // Write results JSON (for frontend consumption)
    let results_json = serde_json::to_string_pretty(&result).expect("Failed to serialize results");
    std::fs::write(output_dir.join("results.json"), results_json)
        .expect("Failed to write results.json");

    // Also write the snapshot for the dashboard to consume
    let snapshot_json = serde_json::to_string_pretty(&snapshot).expect("Failed to serialize snapshot");
    std::fs::write(output_dir.join("snapshot.json"), snapshot_json)
        .expect("Failed to write snapshot.json");

    println!();
    println!("✓ Outputs generated in {:?}", output_dir);
    println!(
        "✓ Results written to {}/results.json",
        output_dir.display()
    );
    println!(
        "✓ Snapshot written to {}/snapshot.json",
        output_dir.display()
    );
}

/// Apply a basis-points shock as a price RISE (for short-squeeze scenarios).
fn apply_shock_up(price: u64, shock_bps: u64) -> u64 {
    let increase_bps = BPS_DENOMINATOR + shock_bps;
    price
        .checked_mul(increase_bps)
        .expect("Price * increase_bps overflow")
        / BPS_DENOMINATOR
}
