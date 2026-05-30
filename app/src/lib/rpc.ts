import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import IDL from "./proof_of_panic.json";
import { Snapshot, SimResult, PositionResult, getLeverage, SCALE, CB_THRESHOLD, RISK_SCORE_MAX } from "./types";

const PROGRAM_ID = new PublicKey(IDL.address);
const CONNECTION = new Connection("http://127.0.0.1:8899", "confirmed");

export async function fetchLiveState(): Promise<{ snapshot: Snapshot; result: SimResult } | null> {
  try {
    const provider = new AnchorProvider(CONNECTION, {} as any, {});
    const program = new Program(IDL as Idl, provider);

    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      PROGRAM_ID
    );
    const [riskConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("risk_config")],
      PROGRAM_ID
    );
    const [positionBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position_book")],
      PROGRAM_ID
    );

    const globalState: any = await (program as any).account.globalState.fetch(globalStatePda);
    const riskConfig: any = await (program as any).account.riskConfig.fetch(riskConfigPda);
    const positionBook: any = await (program as any).account.positionBook.fetch(positionBookPda);

    // Map to Snapshot
    const positions = positionBook.positions.map((p: any) => ({
      owner: p.owner.toBase58(),
      collateral: p.collateral.toNumber(),
      size: p.size.toNumber(),
      entry_price: p.entryPrice.toNumber(),
      is_long: p.isLong === 1,
      is_open: p.isOpen === 1,
    }));

    const snapshot: Snapshot = {
      oracle_price: globalState.oraclePrice.toNumber(),
      insurance_fund: globalState.insuranceFund.toNumber(),
      positions,
      risk_config: {
        maintenance_margin_bps: riskConfig.maintenanceMarginBps.toNumber(),
        liquidation_fee_bps: riskConfig.liquidationFeeBps.toNumber(),
        liquidation_target_margin_bps: riskConfig.liquidationTargetMarginBps.toNumber(),
        circuit_breaker_threshold: riskConfig.circuitBreakerThreshold.toNumber(),
        shock_magnitude_bps: riskConfig.shockMagnitudeBps.toNumber(),
      },
    };

    // Calculate live position results purely from current state (like a keeper)
    const shockBps = snapshot.risk_config.shock_magnitude_bps;
    const prePrice = snapshot.oracle_price;
    const postPrice = prePrice * (1 - shockBps / 10000); // Assume downward shock for live demo

    const position_results: PositionResult[] = positions.map((pos: any, index: number) => {
      if (!pos.is_open) {
        return {
          index, unrealized_pnl: 0, margin_ratio_bps: 0, is_liquidated: false,
          liquidation_loss: 0, liquidation_fee_paid: 0, liquidated_size: 0, effective_collateral: 0
        };
      }

      const isLong = pos.is_long;
      let pnl = 0;
      if (isLong) {
        pnl = (pos.size * (postPrice - pos.entry_price)) / pos.entry_price;
      } else {
        pnl = (pos.size * (pos.entry_price - postPrice)) / pos.entry_price;
      }

      const effectiveCollateral = pos.collateral + pnl;
      let marginRatio = 0;
      if (pos.size > 0) {
        marginRatio = (effectiveCollateral * 10000) / pos.size;
      }

      const isLiquidated = marginRatio < snapshot.risk_config.maintenance_margin_bps;

      return {
        index,
        unrealized_pnl: pnl,
        margin_ratio_bps: marginRatio,
        is_liquidated: isLiquidated,
        liquidation_loss: isLiquidated ? pos.collateral : 0,
        liquidation_fee_paid: 0,
        liquidated_size: 0,
        effective_collateral: effectiveCollateral,
      };
    });

    const numLiquidated = position_results.filter(r => r.is_liquidated).length;
    const riskScore = globalState.lastRiskScore.toNumber();
    const cbActive = globalState.circuitBreakerActive;

    const result: SimResult = {
      pre_shock_price: prePrice,
      post_shock_price: postPrice,
      shock_bps: shockBps,
      shock_direction_up: false,
      position_results,
      num_liquidated: numLiquidated,
      total_losses: 0, // Simplified for UI
      total_fees_collected: 0,
      insurance_fund_remaining: globalState.insuranceFund.toNumber(),
      total_bad_debt: 0,
      risk_score: riskScore,
      protocol_solvent: riskScore < RISK_SCORE_MAX,
      state_hash: [], // Omitted for UI
    };

    return { snapshot, result };
  } catch (err) {
    console.error("Live RPC Error:", err);
    return null;
  }
}
