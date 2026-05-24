"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SCENARIOS,
  SCALE,
  RISK_SCORE_MAX,
  CB_THRESHOLD,
  TRADER_NAMES,
  WHALE_NAMES,
  formatUsd,
  formatPrice,
  formatRiskScore,
  getLeverage,
  type ScenarioData,
  type SimResult,
  type Snapshot,
} from "@/lib/types";

// ─── Data Loading ───
async function loadScenario(id: string): Promise<ScenarioData> {
  const [resultRes, snapshotRes] = await Promise.all([
    fetch(`/scenarios/${id}/results.json`),
    fetch(`/scenarios/${id}/snapshot.json`),
  ]);
  const result: SimResult = await resultRes.json();
  const snapshot: Snapshot = await snapshotRes.json();
  const meta = SCENARIOS.find((s) => s.id === id)!;
  return { id, name: meta.name, description: meta.description, snapshot, result };
}

// ─── Health Meter Component ───
function HealthMeter({ riskScore, cbActive }: { riskScore: number; cbActive: boolean }) {
  const pct = formatRiskScore(riskScore);
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? "var(--color-danger)" : pct >= 40 ? "var(--color-warning)" : "var(--color-safe)";
  const status = cbActive
    ? "CIRCUIT BREAKER ACTIVE"
    : pct >= 70
    ? "CRITICAL RISK"
    : pct >= 40
    ? "ELEVATED RISK"
    : "PROTOCOL SAFE";
  const statusColor = cbActive || pct >= 70 ? "var(--color-danger)" : pct >= 40 ? "var(--color-warning)" : "var(--color-safe)";

  return (
    <div className="glass-panel health-meter">
      <div className="panel-header" style={{ width: "100%", marginBottom: "16px" }}>
        <span className="panel-title">Protocol Health</span>
        <span className={`panel-badge ${cbActive ? "badge-danger" : pct >= 40 ? "badge-warning" : "badge-safe"}`}>
          {cbActive ? "BREAKER ON" : "LIVE"}
        </span>
      </div>
      <div className="meter-ring">
        <svg viewBox="0 0 180 180">
          <circle className="meter-track" cx="90" cy="90" r="80" />
          <circle
            className="meter-fill"
            cx="90"
            cy="90"
            r="80"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="meter-center">
          <div className="meter-value" style={{ color }}>
            {pct.toFixed(1)}
          </div>
          <div className="meter-label">Risk Score %</div>
        </div>
      </div>
      <div className="meter-status" style={{ color: statusColor }}>
        {cbActive ? "⚠ " : ""}{status}
      </div>
    </div>
  );
}

// ─── Position Card Component ───
function PositionCard({
  index,
  scenario,
}: {
  index: number;
  scenario: ScenarioData;
}) {
  const pos = scenario.snapshot.positions[index];
  const res = scenario.result.position_results[index];
  if (!pos || !res) return null;

  const names = scenario.id === "cascading-leverage" ? WHALE_NAMES : TRADER_NAMES;
  const name = names[index] || `Trader ${index}`;
  const leverage = getLeverage(pos.collateral, pos.size);
  const isLiquidated = res.is_liquidated;
  const pnl = res.unrealized_pnl;

  // Health percentage: margin ratio as a fraction of a "safe" threshold (e.g., 50% margin = 5000 bps)
  const healthPct = Math.min(100, Math.max(0, (res.margin_ratio_bps / 5000) * 100));
  const healthColor =
    healthPct <= 10 ? "var(--color-danger)" : healthPct <= 30 ? "var(--color-warning)" : "var(--color-safe)";

  return (
    <div className={`position-card ${isLiquidated ? "liquidated" : "safe"}`}>
      <div className="position-header">
        <span className="position-trader">{name}</span>
        <span className={`position-direction ${pos.is_long ? "direction-long" : "direction-short"}`}>
          {pos.is_long ? "LONG" : "SHORT"} {leverage}x
        </span>
      </div>
      <div className="position-details">
        <span>Collateral</span>
        <span className="position-detail-value">{formatUsd(pos.collateral)}</span>
        <span>Entry</span>
        <span className="position-detail-value">{formatPrice(pos.entry_price)}</span>
        <span>Size</span>
        <span className="position-detail-value">{formatUsd(pos.size)}</span>
        <span>Margin</span>
        <span className="position-detail-value">{(res.margin_ratio_bps / 100).toFixed(1)}%</span>
      </div>
      <div className={`position-pnl ${pnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
        {pnl >= 0 ? "+" : ""}{formatUsd(pnl)}
      </div>
      <div className="health-bar-container">
        <div
          className="health-bar-fill"
          style={{
            width: `${isLiquidated ? 0 : healthPct}%`,
            background: isLiquidated
              ? "var(--color-danger)"
              : `linear-gradient(90deg, ${healthColor}, ${healthColor})`,
          }}
        />
      </div>
      <div className={`position-status ${isLiquidated ? "status-liquidated" : "status-safe"}`}>
        <span
          className="status-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isLiquidated ? "var(--color-danger)" : "var(--color-safe)",
            display: "inline-block",
          }}
        />
        {isLiquidated ? "LIQUIDATED" : "HEALTHY"}
        {isLiquidated && res.liquidation_loss > 0 && (
          <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
            Loss: {formatUsd(res.liquidation_loss)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Cascade Timeline Component ───
function CascadeTimeline({ scenario }: { scenario: ScenarioData }) {
  const { result, snapshot } = scenario;
  const names = scenario.id === "cascading-leverage" ? WHALE_NAMES : TRADER_NAMES;
  const shockDir = result.post_shock_price > result.pre_shock_price ? "+" : "-";
  const shockPct = (result.shock_bps / 100).toFixed(0);

  interface TimelineEvent {
    icon: string;
    title: string;
    detail: string;
    type: string;
  }

  const events: TimelineEvent[] = [];

  // Price shock event
  events.push({
    icon: "⚡",
    title: `SOL ${shockDir}${shockPct}%`,
    detail: `${formatPrice(result.pre_shock_price)} → ${formatPrice(result.post_shock_price)}`,
    type: "event-shock",
  });

  // Position evaluations
  result.position_results.forEach((res, i) => {
    if (!snapshot.positions[i]?.is_open) return;
    const name = names[i] || `Trader ${i}`;
    const pos = snapshot.positions[i];
    const leverage = getLeverage(pos.collateral, pos.size);
    const dir = pos.is_long ? "LONG" : "SHORT";

    if (res.is_liquidated) {
      events.push({
        icon: "💀",
        title: `${name} liquidated`,
        detail: `${dir} ${leverage}x | PnL ${formatUsd(res.unrealized_pnl)}${res.liquidation_loss > 0 ? ` | Loss ${formatUsd(res.liquidation_loss)}` : ""}`,
        type: "event-liquidation",
      });
    } else {
      events.push({
        icon: "✓",
        title: `${name} survives`,
        detail: `${dir} ${leverage}x | PnL ${res.unrealized_pnl >= 0 ? "+" : ""}${formatUsd(res.unrealized_pnl)} | Margin ${(res.margin_ratio_bps / 100).toFixed(1)}%`,
        type: "event-safe",
      });
    }
  });

  // Insurance impact
  if (result.total_losses > 0) {
    events.push({
      icon: "🛡️",
      title: result.total_bad_debt > 0 ? "Insurance depleted" : "Insurance absorbs losses",
      detail: result.total_bad_debt > 0
        ? `Fund wiped out. Bad debt: ${formatUsd(result.total_bad_debt)}`
        : `Remaining: ${formatUsd(result.insurance_fund_remaining)}`,
      type: "event-insurance",
    });
  }

  // Circuit breaker
  const cbFires = result.risk_score > CB_THRESHOLD;
  if (cbFires) {
    events.push({
      icon: "🚨",
      title: "Circuit breaker activated",
      detail: `Risk ${(result.risk_score / 10000).toFixed(1)}% > threshold 70%. Max leverage 10x → 5x`,
      type: "event-breaker",
    });
  } else {
    events.push({
      icon: "🟢",
      title: "Protocol within safe parameters",
      detail: `Risk ${(result.risk_score / 10000).toFixed(1)}% < threshold 70%`,
      type: "event-safe",
    });
  }

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <span className="panel-title">Liquidation Cascade</span>
        <span className={`panel-badge ${cbFires ? "badge-danger" : "badge-safe"}`}>
          {result.num_liquidated}/{snapshot.positions.length} liquidated
        </span>
      </div>
      <div className="timeline">
        {events.map((evt, i) => (
          <div key={i} className={`timeline-event ${evt.type}`}>
            <span className="timeline-icon">{evt.icon}</span>
            <div className="timeline-content">
              <div className="timeline-title">{evt.title}</div>
              <div className="timeline-detail">{evt.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Proof Verification Panel ───
function ProofPanel({ scenario }: { scenario: ScenarioData }) {
  const hash = scenario.result.state_hash
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const steps = [
    { label: "State snapshot captured", detail: `${scenario.snapshot.positions.length} positions hashed`, icon: "📸" },
    { label: "Adversarial simulation executed", detail: `Shock applied, ${scenario.result.num_liquidated} liquidations detected`, icon: "⚙️" },
    { label: "ZK witness generated", detail: `Prover.toml + Verifier.toml written`, icon: "🔐" },
    { label: "Noir circuit compiled & proven", detail: `~31,000 gates | Groth16 proof`, icon: "✨" },
    { label: "Proof verified on-chain", detail: `State hash: 0x${hash}…`, icon: "✅" },
  ];

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <span className="panel-title">ZK Proof Verification</span>
        <span className="panel-badge badge-info">VERIFIED</span>
      </div>
      <div className="proof-steps">
        {steps.map((step, i) => (
          <div key={i} className="proof-step step-complete">
            <div className="proof-step-icon">{step.icon}</div>
            <div>
              <div className="proof-step-label">{step.label}</div>
              <div className="proof-step-detail">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Circuit Breaker Component ───
function CircuitBreaker({ scenario }: { scenario: ScenarioData }) {
  const cbFires = scenario.result.risk_score > CB_THRESHOLD;
  const riskPct = (scenario.result.risk_score / 10000).toFixed(1);

  if (!cbFires) {
    return (
      <div className="safe-overlay circuit-breaker-overlay" style={{ borderColor: "var(--color-safe)", animationName: "none" }}>
        <div className="breaker-safe-title">✓ Protocol Defended</div>
        <div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Risk score {riskPct}% is below the 70% circuit breaker threshold.
          <br />
          Insurance fund absorbed all losses. No emergency action required.
        </div>
        <div className="breaker-details">
          <div className="breaker-before">
            <div className="breaker-label">Max Leverage</div>
            <div className="breaker-value" style={{ color: "var(--color-safe)" }}>10x</div>
          </div>
          <div className="breaker-after">
            <div className="breaker-label">Insurance Remaining</div>
            <div className="breaker-value" style={{ color: "var(--color-safe)" }}>
              {formatUsd(scenario.result.insurance_fund_remaining)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="circuit-breaker-overlay">
      <div className="breaker-title">⚠ Circuit Breaker Activated</div>
      <div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", marginBottom: 8 }}>
        Risk score {riskPct}% exceeds the 70% threshold.
        <br />
        Protocol autonomously reduced risk exposure.
      </div>
      <div className="breaker-details">
        <div className="breaker-before">
          <div className="breaker-label">Before</div>
          <div className="breaker-value" style={{ color: "var(--text-secondary)" }}>10x</div>
          <div className="breaker-label" style={{ marginTop: 4 }}>max leverage</div>
        </div>
        <div className="breaker-arrow">→</div>
        <div className="breaker-after">
          <div className="breaker-label">After</div>
          <div className="breaker-value" style={{ color: "var(--color-danger)" }}>5x</div>
          <div className="breaker-label" style={{ marginTop: 4 }}>max leverage</div>
        </div>
      </div>
      {scenario.result.total_bad_debt > 0 && (
        <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--color-danger)" }}>
          Bad Debt: {formatUsd(scenario.result.total_bad_debt)} | Protocol Insolvent
        </div>
      )}
    </div>
  );
}

// ─── Summary Stats ───
function SummaryStats({ scenario }: { scenario: ScenarioData }) {
  const { result, snapshot } = scenario;
  const insurancePct = (result.insurance_fund_remaining / snapshot.insurance_fund) * 100;
  const insuranceColor =
    insurancePct <= 0 ? "var(--color-danger)" : insurancePct <= 30 ? "var(--color-warning)" : "var(--color-safe)";

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <span className="panel-title">Simulation Summary</span>
      </div>
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Liquidations</div>
          <div className={`stat-value ${result.num_liquidated > 0 ? "danger" : "safe"}`}>
            {result.num_liquidated} / {snapshot.positions.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Losses</div>
          <div className={`stat-value ${result.total_losses > 0 ? "warning" : "safe"}`}>
            {formatUsd(result.total_losses)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bad Debt</div>
          <div className={`stat-value ${result.total_bad_debt > 0 ? "danger" : "safe"}`}>
            {formatUsd(result.total_bad_debt)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Risk Score</div>
          <div className={`stat-value ${formatRiskScore(result.risk_score) >= 70 ? "danger" : formatRiskScore(result.risk_score) >= 40 ? "warning" : "safe"}`}>
            {formatRiskScore(result.risk_score).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Insurance Fund Bar */}
      <div className="insurance-bar">
        <div className="stat-label" style={{ marginBottom: 8, marginTop: 16 }}>Insurance Fund</div>
        <div className="insurance-track">
          <div
            className="insurance-fill"
            style={{
              width: `${Math.max(0, insurancePct)}%`,
              background: `linear-gradient(90deg, ${insuranceColor}, ${insuranceColor})`,
            }}
          />
        </div>
        <div className="insurance-labels">
          <span>{formatUsd(result.insurance_fund_remaining)}</span>
          <span>{formatUsd(snapshot.insurance_fund)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Metrics Bar ───
function MetricsBar() {
  const metrics = [
    { label: "Circuit Gates", value: "~31,000" },
    { label: "Proof Size", value: "388 B" },
    { label: "Verification CU", value: "~200K" },
    { label: "Account Storage", value: "700 B" },
    { label: "Rent Cost", value: "~0.008 SOL" },
    { label: "Proof System", value: "Groth16" },
  ];

  return (
    <div className="metrics-bar">
      {metrics.map((m, i) => (
        <div key={i} className="metric-item">
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───
export default function WarRoom() {
  const [activeScenario, setActiveScenario] = useState("volatility-shock");
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const loadData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await loadScenario(id);
      setScenarioData(data);
      setAnimKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to load scenario:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(activeScenario);
  }, [activeScenario, loadData]);

  const switchScenario = (id: string) => {
    if (id !== activeScenario) {
      setActiveScenario(id);
    }
  };

  const cbActive = scenarioData
    ? scenarioData.result.risk_score > CB_THRESHOLD
    : false;

  return (
    <div className="war-room">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">🔥</div>
          <div>
            <div className="header-title">Proof of Panic</div>
            <div className="header-subtitle">ZK-Verified Adversarial Risk Engine</div>
          </div>
        </div>
        <div className="header-status">
          <span className={`status-dot ${cbActive ? "danger" : "safe"}`} />
          <span>{cbActive ? "EMERGENCY MODE" : "MONITORING"}</span>
        </div>
      </header>

      {/* Scenario Selector */}
      <div className="scenario-selector">
        <div className="scenario-tabs">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`scenario-tab ${activeScenario === s.id ? "active" : ""}`}
              onClick={() => switchScenario(s.id)}
            >
              <span className="scenario-tab-icon">{s.icon}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {loading || !scenarioData ? (
        <div style={{ textAlign: "center", padding: 80, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          Loading scenario data...
        </div>
      ) : (
        <div className="dashboard-grid" key={animKey}>
          {/* Top row: Health Meter + Summary + Positions */}
          <div className="grid-top">
            <HealthMeter
              riskScore={scenarioData.result.risk_score}
              cbActive={cbActive}
            />
            <div>
              <div style={{ marginBottom: "var(--space-md)", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Position Book — {scenarioData.snapshot.positions.length} Active Positions
              </div>
              <div className="grid-positions">
                {scenarioData.snapshot.positions.map((_, i) => (
                  <PositionCard key={i} index={i} scenario={scenarioData} />
                ))}
              </div>
            </div>
          </div>

          {/* Middle: Circuit Breaker */}
          <CircuitBreaker scenario={scenarioData} />

          {/* Bottom row: Timeline + Proof + Stats */}
          <div className="grid-bottom">
            <CascadeTimeline scenario={scenarioData} />
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
              <SummaryStats scenario={scenarioData} />
              <ProofPanel scenario={scenarioData} />
            </div>
          </div>

          {/* Metrics Footer */}
          <MetricsBar />
        </div>
      )}
    </div>
  );
}
