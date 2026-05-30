#![no_main]
sp1_zkvm::entrypoint!(main);

use panic_simulator::types::{Snapshot, SimPosition, SimRiskConfig};
use panic_simulator::liquidation::evaluate_positions;
use panic_simulator::solvency::compute_solvency;
use panic_simulator::commitment::compute_state_hash;
use panic_simulator::shock::{apply_shock, apply_shock_up};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PublicValuesStruct {
    pub state_hash: [u8; 32],
    pub pre_shock_price: u64,
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
    ) = compute_solvency(
        &position_results,
        snapshot.insurance_fund,
        &snapshot.positions,
    );

    let public_values = PublicValuesStruct {
        state_hash,
        pre_shock_price: snapshot.oracle_price,
        bad_debt: total_bad_debt,
        risk_score,
        num_liquidated,
    };
    
    let bytes = bincode::serialize(&public_values).unwrap();
    sp1_zkvm::io::commit_slice(&bytes);
}
