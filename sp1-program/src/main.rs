#![no_main]
sp1_zkvm::entrypoint!(main);

use panic_simulator::types::{Snapshot, SimPosition, SimRiskConfig};
use panic_simulator::liquidation::evaluate_positions;
use panic_simulator::solvency::compute_solvency;
use panic_simulator::commitment::compute_state_hash;
use panic_simulator::shock::{apply_shock, apply_shock_up};
use borsh::BorshSerialize;
use serde::{Deserialize, Serialize};

const PROOF_SCHEMA_VERSION: u32 = 1;

#[derive(Serialize, Deserialize, BorshSerialize)]
pub struct PublicValuesStruct {
    pub state_hash: [u8; 32],
    pub schema_version: u32,
    pub pre_shock_price: u64,
    pub post_shock_price: u64,
    pub shock_bps: u64,
    pub shock_direction_up: u8,
    pub maintenance_margin_bps: u64,
    pub liquidation_fee_bps: u64,
    pub liquidation_target_margin_bps: u64,
    pub circuit_breaker_threshold: u64,
    pub insurance_fund: u64,
    pub bad_debt: u64,
    pub risk_score: u64,
    pub num_liquidated: u64,
}

pub fn main() {
    let mut snapshot: Snapshot = sp1_zkvm::io::read::<Snapshot>();
    let shock_bps: u64 = sp1_zkvm::io::read::<u64>();
    let shock_direction_up: bool = sp1_zkvm::io::read::<bool>();

    let state_hash = compute_state_hash(&snapshot.positions);

    let post_shock_price = if shock_direction_up {
        apply_shock_up(snapshot.oracle_price, shock_bps)
    } else {
        apply_shock(snapshot.oracle_price, shock_bps)
    };

    let mut positions = snapshot.positions.clone();
    let (position_results, _final_post_shock_price) = evaluate_positions(
        &mut positions,
        post_shock_price,
        &snapshot.risk_config,
    );

    let num_liquidated = position_results.iter().filter(|r| r.is_liquidated).count() as u64;

    let (
        _insurance_fund_remaining,
        total_bad_debt,
        risk_score,
        _protocol_solvent,
        _total_fees_collected,
    ) = compute_solvency(
        &position_results,
        snapshot.insurance_fund,
        &snapshot.positions,
    );

    let public_values = PublicValuesStruct {
        state_hash,
        schema_version: PROOF_SCHEMA_VERSION,
        pre_shock_price: snapshot.oracle_price,
        post_shock_price,
        shock_bps,
        shock_direction_up: if shock_direction_up { 1 } else { 0 },
        maintenance_margin_bps: snapshot.risk_config.maintenance_margin_bps,
        liquidation_fee_bps: snapshot.risk_config.liquidation_fee_bps,
        liquidation_target_margin_bps: snapshot.risk_config.liquidation_target_margin_bps,
        circuit_breaker_threshold: snapshot.risk_config.circuit_breaker_threshold,
        insurance_fund: snapshot.insurance_fund,
        bad_debt: total_bad_debt,
        risk_score,
        num_liquidated,
    };

    let bytes = public_values.try_to_vec().expect("borsh serialize public values");
    sp1_zkvm::io::commit_slice(&bytes);
}
