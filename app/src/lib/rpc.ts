import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import IDL from "./proof_of_panic.json";
import {
  Snapshot,
  SimResult,
  PositionResult,
  SCALE,
  CB_THRESHOLD,
  RISK_SCORE_MAX,
} from "./types";

const PROGRAM_ID = new PublicKey(IDL.address);
const CONNECTION = new Connection("http://127.0.0.1:8899", "confirmed");

export async function fetchLiveState(): Promise<{
  snapshot: Snapshot;
  result: SimResult;
} | null> {
  try {
    const wallet = new (class {
      publicKey = Keypair.generate().publicKey;
      signAllTransactions = async <T>(txs: T[]) => txs;
      signTransaction = async <T>(tx: T) => tx;
    })();
    const provider = new AnchorProvider(CONNECTION, wallet as any, {
      commitment: "confirmed",
    });
    const program = new Program(IDL as Idl, provider);

    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_state")],
      PROGRAM_ID,
    );
    const [riskConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("risk_config")],
      PROGRAM_ID,
    );
    const [positionBookPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position_book")],
      PROGRAM_ID,
    );

    const globalState: any = await (program as any).account.globalState.fetch(
      globalStatePda,
    );
    const riskConfig: any = await (program as any).account.riskConfig.fetch(
      riskConfigPda,
    );
    const positionBook: any = await (program as any).account.positionBook.fetch(
      positionBookPda,
    );

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
        liquidation_target_margin_bps:
          riskConfig.liquidationTargetMarginBps.toNumber(),
        circuit_breaker_threshold:
          riskConfig.circuitBreakerThreshold.toNumber(),
        shock_magnitude_bps: riskConfig.shockMagnitudeBps.toNumber(),
      },
    };

    // Calculate live position results using the same simplified cascade model as the dashboard.
    const shockBps = snapshot.risk_config.shock_magnitude_bps;
    const prePrice = snapshot.oracle_price;
    const postPrice = Math.floor((prePrice * (10000 - shockBps)) / 10000);

    const position_results: PositionResult[] = positions.map(
      (pos: any, index: number) => {
        if (!pos.is_open) {
          return {
            index,
            unrealized_pnl: 0,
            margin_ratio_bps: 0,
            is_liquidated: false,
            liquidation_loss: 0,
            liquidation_fee_paid: 0,
            liquidated_size: 0,
            effective_collateral: 0,
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
          marginRatio = Math.max(
            0,
            Math.floor((effectiveCollateral * 10000) / pos.size),
          );
        }

        const isLiquidated =
          marginRatio < snapshot.risk_config.maintenance_margin_bps;
        const fee = isLiquidated
          ? Math.floor(
              (pos.size * snapshot.risk_config.liquidation_fee_bps) / 10000,
            )
          : 0;
        const liquidatedSize = isLiquidated ? Math.floor(pos.size / 2) : 0;

        return {
          index,
          unrealized_pnl: pnl,
          margin_ratio_bps: marginRatio,
          is_liquidated: isLiquidated,
          liquidation_loss: isLiquidated
            ? Math.max(0, -effectiveCollateral) +
              Math.max(0, fee - pos.collateral)
            : 0,
          liquidation_fee_paid: fee,
          liquidated_size: liquidatedSize,
          effective_collateral: effectiveCollateral,
        };
      },
    );

    const numLiquidated = position_results.filter(
      (r) => r.is_liquidated,
    ).length;
    const riskScore = globalState.lastRiskScore.toNumber();
    const cbActive = globalState.circuitBreakerActive;
    const totalLosses = position_results.reduce(
      (sum, entry) => sum + entry.liquidation_loss,
      0,
    );
    const totalFees = position_results.reduce(
      (sum, entry) => sum + entry.liquidation_fee_paid,
      0,
    );
    const insuranceRemaining = Math.max(
      0,
      snapshot.insurance_fund + totalFees - totalLosses,
    );

    const result: SimResult = {
      pre_shock_price: prePrice,
      post_shock_price: postPrice,
      shock_bps: shockBps,
      shock_direction_up: false,
      position_results,
      num_liquidated: numLiquidated,
      total_losses: totalLosses,
      total_fees_collected: totalFees,
      insurance_fund_remaining: insuranceRemaining,
      total_bad_debt: Math.max(
        0,
        totalLosses - (snapshot.insurance_fund + totalFees),
      ),
      risk_score: riskScore,
      protocol_solvent: cbActive ? riskScore < RISK_SCORE_MAX : true,
      state_hash: Array.from(globalState.lastStateHash || []),
    };

    return { snapshot, result };
  } catch (err) {
    console.error("Live RPC Error:", err);
    return null;
  }
}
