//! Noir witness generation.
//!
//! Writes the Prover.toml and Verifier.toml files that Noir/nargo expect.
//! The Prover.toml contains all inputs (public + private witness).
//! The Verifier.toml contains only the public inputs.

use std::fmt::Write;
use std::path::Path;

use crate::types::*;

/// Write the Noir witness files for proof generation.
///
/// Prover.toml: all inputs (private positions + computed results + public params)
/// Verifier.toml: only public inputs
pub fn write_witness_files(
    output_dir: &Path,
    snapshot: &Snapshot,
    result: &SimResult,
) -> std::io::Result<()> {
    let prover_toml = generate_prover_toml(snapshot, result);
    let verifier_toml = generate_verifier_toml(result);

    std::fs::write(output_dir.join("Prover.toml"), prover_toml)?;
    std::fs::write(output_dir.join("Verifier.toml"), verifier_toml)?;

    Ok(())
}

/// Generate the Prover.toml content with all circuit inputs.
fn generate_prover_toml(snapshot: &Snapshot, result: &SimResult) -> String {
    let mut toml = String::new();

    // ── Public inputs ──
    writeln!(toml, "# Public inputs").unwrap();
    write_state_hash(&mut toml, "state_hash", &result.state_hash);
    writeln!(toml, "pre_shock_price = \"{}\"", result.pre_shock_price).unwrap();
    writeln!(toml, "post_shock_price = \"{}\"", result.post_shock_price).unwrap();
    writeln!(
        toml,
        "maintenance_margin_bps = \"{}\"",
        snapshot.risk_config.maintenance_margin_bps
    )
    .unwrap();
    writeln!(toml, "insurance_fund_before = \"{}\"", snapshot.insurance_fund).unwrap();
    writeln!(toml, "total_bad_debt = \"{}\"", result.total_bad_debt).unwrap();
    writeln!(toml, "risk_score = \"{}\"", result.risk_score).unwrap();
    writeln!(toml, "num_liquidated = \"{}\"", result.num_liquidated).unwrap();

    writeln!(toml).unwrap();
    writeln!(toml, "# Private witness — position data").unwrap();

    // Position arrays — serialize each field as an array of MAX_POSITIONS elements
    write_u64_array(
        &mut toml,
        "positions_collateral",
        &padded_field(&snapshot.positions, |p| p.collateral),
    );
    write_u64_array(
        &mut toml,
        "positions_size",
        &padded_field(&snapshot.positions, |p| p.size),
    );
    write_u64_array(
        &mut toml,
        "positions_entry_price",
        &padded_field(&snapshot.positions, |p| p.entry_price),
    );
    write_u8_array(
        &mut toml,
        "positions_is_long",
        &padded_u8_field(&snapshot.positions, |p| if p.is_long { 1 } else { 0 }),
    );
    write_u8_array(
        &mut toml,
        "positions_is_open",
        &padded_u8_field(&snapshot.positions, |p| if p.is_open { 1 } else { 0 }),
    );

    // Position owner bytes — 2D array [8][32]
    writeln!(toml).unwrap();
    writeln!(toml, "# Position owner bytes for hash verification").unwrap();
    write_owner_bytes_array(&mut toml, &snapshot.positions);

    // Computed results per position
    writeln!(toml).unwrap();
    writeln!(toml, "# Private witness — computed results").unwrap();

    // PnL as absolute values + sign flags (Noir doesn't have signed integers natively)
    let pnl_abs: Vec<u64> = result
        .position_results
        .iter()
        .map(|r| r.unrealized_pnl.unsigned_abs())
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect();
    let pnl_sign: Vec<u8> = result
        .position_results
        .iter()
        .map(|r| if r.unrealized_pnl < 0 { 1 } else { 0 })
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect();

    write_u64_array(&mut toml, "computed_pnl", &pnl_abs);
    write_u8_array(&mut toml, "computed_pnl_sign", &pnl_sign);
    write_u64_array(
        &mut toml,
        "computed_margin_ratio",
        &padded_from_results(&result.position_results, |r| r.margin_ratio_bps),
    );
    write_u8_array(
        &mut toml,
        "computed_liquidated",
        &padded_u8_from_results(&result.position_results, |r| {
            if r.is_liquidated { 1 } else { 0 }
        }),
    );
    write_u64_array(
        &mut toml,
        "computed_loss",
        &padded_from_results(&result.position_results, |r| r.liquidation_loss),
    );

    toml
}

/// Generate the Verifier.toml content with only public inputs.
fn generate_verifier_toml(result: &SimResult) -> String {
    let mut toml = String::new();
    writeln!(toml, "# Public inputs for on-chain verification").unwrap();
    write_state_hash(&mut toml, "state_hash", &result.state_hash);
    writeln!(toml, "pre_shock_price = \"{}\"", result.pre_shock_price).unwrap();
    writeln!(toml, "post_shock_price = \"{}\"", result.post_shock_price).unwrap();
    // Include other public inputs as needed by the circuit
    writeln!(toml, "maintenance_margin_bps = \"500\"").unwrap();
    writeln!(
        toml,
        "insurance_fund_before = \"{}\"",
        result.insurance_fund_remaining + result.total_bad_debt + result.total_losses
    )
    .unwrap();
    writeln!(toml, "total_bad_debt = \"{}\"", result.total_bad_debt).unwrap();
    writeln!(toml, "risk_score = \"{}\"", result.risk_score).unwrap();
    writeln!(toml, "num_liquidated = \"{}\"", result.num_liquidated).unwrap();
    toml
}

// ── Helper functions for TOML formatting ──

fn write_state_hash(toml: &mut String, name: &str, hash: &[u8; 32]) {
    let values: Vec<String> = hash.iter().map(|b| format!("\"{}\"", b)).collect();
    writeln!(toml, "{} = [{}]", name, values.join(", ")).unwrap();
}

fn write_u64_array(toml: &mut String, name: &str, values: &[u64]) {
    let formatted: Vec<String> = values.iter().map(|v| format!("\"{}\"", v)).collect();
    writeln!(toml, "{} = [{}]", name, formatted.join(", ")).unwrap();
}

fn write_u8_array(toml: &mut String, name: &str, values: &[u8]) {
    let formatted: Vec<String> = values.iter().map(|v| format!("\"{}\"", v)).collect();
    writeln!(toml, "{} = [{}]", name, formatted.join(", ")).unwrap();
}

fn write_owner_bytes_array(toml: &mut String, positions: &[SimPosition]) {
    writeln!(toml, "# positions_owner_bytes: [[u8; 32]; 8]").unwrap();
    for i in 0..MAX_POSITIONS {
        if i < positions.len() {
            let owner_bytes = hex::decode(&positions[i].owner).unwrap_or_else(|_| vec![0u8; 32]);
            let values: Vec<String> = owner_bytes
                .iter()
                .take(32)
                .map(|b| format!("\"{}\"", b))
                .collect();
            writeln!(toml, "positions_owner_bytes_{} = [{}]", i, values.join(", ")).unwrap();
        } else {
            let zeros: Vec<String> = (0..32).map(|_| "\"0\"".to_string()).collect();
            writeln!(toml, "positions_owner_bytes_{} = [{}]", i, zeros.join(", ")).unwrap();
        }
    }
}

fn padded_field(positions: &[SimPosition], f: fn(&SimPosition) -> u64) -> Vec<u64> {
    positions
        .iter()
        .map(f)
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect()
}

fn padded_u8_field(positions: &[SimPosition], f: fn(&SimPosition) -> u8) -> Vec<u8> {
    positions
        .iter()
        .map(f)
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect()
}

fn padded_from_results(results: &[PositionResult], f: fn(&PositionResult) -> u64) -> Vec<u64> {
    results
        .iter()
        .map(f)
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect()
}

fn padded_u8_from_results(results: &[PositionResult], f: fn(&PositionResult) -> u8) -> Vec<u8> {
    results
        .iter()
        .map(f)
        .chain(std::iter::repeat(0))
        .take(MAX_POSITIONS)
        .collect()
}
