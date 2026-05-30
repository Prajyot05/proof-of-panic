// Types matching the Rust simulator output
// These types are shared between the simulator's JSON output and the dashboard

export interface PositionResult {
  index: number;
  unrealized_pnl: number;
  margin_ratio_bps: number;
  is_liquidated: boolean;
  liquidation_loss: number;
  liquidation_fee_paid: number;
  liquidated_size: number;
  effective_collateral: number;
}

export interface SimResult {
  pre_shock_price: number;
  post_shock_price: number;
  shock_bps: number;
  shock_direction_up: boolean;
  position_results: PositionResult[];
  num_liquidated: number;
  total_losses: number;
  total_fees_collected: number;
  insurance_fund_remaining: number;
  total_bad_debt: number;
  risk_score: number;
  protocol_solvent: boolean;
  state_hash: number[];
}

export interface SimPosition {
  owner: string;
  collateral: number;
  size: number;
  entry_price: number;
  is_long: boolean;
  is_open: boolean;
}

export interface SimRiskConfig {
  maintenance_margin_bps: number;
  liquidation_fee_bps: number;
  liquidation_target_margin_bps: number;
  circuit_breaker_threshold: number;
  shock_magnitude_bps: number;
}

export interface Snapshot {
  oracle_price: number;
  insurance_fund: number;
  positions: SimPosition[];
  risk_config: SimRiskConfig;
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  snapshot: Snapshot;
  result: SimResult;
}

export const SCALE = 1_000_000;
export const RISK_SCORE_MAX = 1_000_000;
export const CB_THRESHOLD = 700_000;

// Trader name mapping (matches on-chain init_positions.rs seed order)
export const TRADER_NAMES: Record<number, string> = {
  0: "Alice",
  1: "Bob",
  2: "Charlie",
  3: "Diana",
  4: "Eve",
};

export const WHALE_NAMES: Record<number, string> = {
  0: "Alpha",
  1: "Beta",
  2: "Gamma",
  3: "Delta",
  4: "Epsilon",
  5: "Zeta",
  6: "Eta",
  7: "Theta",
};

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: "volatility-shock",
    name: "Volatility Shock",
    description: "SOL -30%. Cascading liquidations. Circuit breaker fires.",
    icon: "⚡",
  },
  {
    id: "mild-correction",
    name: "Mild Correction",
    description: "SOL -10%. Insurance absorbs losses. Protocol survives.",
    icon: "📉",
  },
  {
    id: "flash-crash",
    name: "Flash Crash",
    description: "SOL -50%. Catastrophic insolvency. Maximum damage.",
    icon: "💥",
  },
  {
    id: "short-squeeze",
    name: "Short Squeeze",
    description: "SOL +40%. Short positions crushed. Longs profit.",
    icon: "🚀",
  },
  {
    id: "cascading-leverage",
    name: "Cascading Leverage",
    description: "SOL -30%. 8 overleveraged longs. Total wipeout.",
    icon: "🔗",
  },
];

// Helper formatters
export function formatUsd(micros: number): string {
  const dollars = Math.abs(micros) / SCALE;
  const sign = micros < 0 ? "-" : "";
  if (dollars >= 1000) {
    return `${sign}$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `${sign}$${dollars.toFixed(2)}`;
}

export function formatPrice(micros: number): string {
  return `$${(micros / SCALE).toFixed(2)}`;
}

export function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function formatRiskScore(score: number): number {
  return (score / RISK_SCORE_MAX) * 100;
}

export function getLeverage(collateral: number, size: number): number {
  if (collateral === 0) return 0;
  return Math.round(size / collateral);
}
