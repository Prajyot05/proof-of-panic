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

// ─── Icons (Inline SVGs) ───
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
);
const ShieldAlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
);
const ShieldCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
);
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
);
const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const CheckCircle2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
);
const FingerprintIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>
);
const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const CpuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
);

// ─── Theme Toggle Hook ───
function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const isDarkMode = document.documentElement.getAttribute("data-theme") === "dark";
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark ? "dark" : "light";
    setIsDark(!isDark);
    if (nextTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return { isDark, toggleTheme };
}

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
    <div className="surface-card health-meter">
      <div className="card-header" style={{ width: "100%" }}>
        <span className="card-title">Protocol Health</span>
        <span className={`card-badge ${cbActive ? "badge-danger" : pct >= 40 ? "badge-warning" : "badge-safe"}`}>
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
        {status}
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
      <div className={`position-pnl ${pnl >= 0 ? "text-safe" : "text-danger"}`}>
        {pnl >= 0 ? "+" : ""}{formatUsd(pnl)}
      </div>
      <div className="health-bar-container">
        <div
          className="health-bar-fill"
          style={{
            width: `${isLiquidated ? 0 : healthPct}%`,
            background: isLiquidated ? "var(--color-danger)" : healthColor,
          }}
        />
      </div>
      <div className={`position-status ${isLiquidated ? "text-danger" : "text-safe"}`}>
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
          <span className="text-muted" style={{ marginLeft: 8 }}>
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
    icon: React.ReactNode;
    title: string;
    detail: string;
    type: string;
  }

  const events: TimelineEvent[] = [];

  // Price shock event
  events.push({
    icon: <ActivityIcon />,
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
        icon: <AlertTriangleIcon />,
        title: `${name} liquidated`,
        detail: `${dir} ${leverage}x | PnL ${formatUsd(res.unrealized_pnl)}${res.liquidation_loss > 0 ? ` | Loss ${formatUsd(res.liquidation_loss)}` : ""}`,
        type: "event-liquidation",
      });
    } else {
      events.push({
        icon: <CheckCircle2Icon />,
        title: `${name} survives`,
        detail: `${dir} ${leverage}x | PnL ${res.unrealized_pnl >= 0 ? "+" : ""}${formatUsd(res.unrealized_pnl)} | Margin ${(res.margin_ratio_bps / 100).toFixed(1)}%`,
        type: "event-safe",
      });
    }
  });

  // Insurance impact
  if (result.total_losses > 0) {
    events.push({
      icon: <ShieldAlertIcon />,
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
      icon: <ZapIcon />,
      title: "Circuit breaker activated",
      detail: `Risk ${(result.risk_score / 10000).toFixed(1)}% > threshold 70%. Max leverage 10x → 5x`,
      type: "event-breaker",
    });
  } else {
    events.push({
      icon: <ShieldCheckIcon />,
      title: "Protocol within safe parameters",
      detail: `Risk ${(result.risk_score / 10000).toFixed(1)}% < threshold 70%`,
      type: "event-safe",
    });
  }

  return (
    <div className="surface-card">
      <div className="card-header">
        <span className="card-title">Liquidation Cascade</span>
        <span className={`card-badge ${cbFires ? "badge-danger" : "badge-safe"}`}>
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
    { label: "State snapshot captured", detail: `${scenario.snapshot.positions.length} positions hashed`, icon: <CheckCircle2Icon /> },
    { label: "Adversarial simulation executed", detail: `Shock applied, ${scenario.result.num_liquidated} liquidations detected`, icon: <ActivityIcon /> },
    { label: "ZK witness generated", detail: `Prover.toml + Verifier.toml written`, icon: <FingerprintIcon /> },
    { label: "Noir circuit compiled & proven", detail: `~31,000 gates | Groth16 proof`, icon: <CpuIcon /> },
    { label: "Proof verified on-chain", detail: `State hash: 0x${hash}…`, icon: <ShieldCheckIcon /> },
  ];

  return (
    <div className="surface-card">
      <div className="card-header">
        <span className="card-title">ZK Proof Verification</span>
        <span className="card-badge badge-info">VERIFIED</span>
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
      <div className="circuit-breaker-overlay">
        <div className="breaker-safe-title">✓ Protocol Defended</div>
        <div className="breaker-desc">
          Risk score {riskPct}% is below the 70% circuit breaker threshold.
          <br />
          Insurance fund absorbed all losses. No emergency action required.
        </div>
        <div className="breaker-details">
          <div className="breaker-box">
            <div className="breaker-label">Max Leverage</div>
            <div className="breaker-value text-safe">10x</div>
          </div>
          <div className="breaker-box">
            <div className="breaker-label">Insurance Remaining</div>
            <div className="breaker-value text-safe">
              {formatUsd(scenario.result.insurance_fund_remaining)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="circuit-breaker-overlay active">
      <div className="breaker-title">⚠ Circuit Breaker Activated</div>
      <div className="breaker-desc text-danger">
        Risk score {riskPct}% exceeds the 70% threshold.
        <br />
        Protocol autonomously reduced risk exposure to prevent cascading insolvency.
      </div>
      <div className="breaker-details">
        <div className="breaker-box">
          <div className="breaker-label">Before</div>
          <div className="breaker-value text-muted">10x</div>
          <div className="breaker-label" style={{ marginTop: 4 }}>max leverage</div>
        </div>
        <div className="breaker-arrow"><ArrowRightIcon /></div>
        <div className="breaker-box highlight">
          <div className="breaker-label">After</div>
          <div className="breaker-value text-danger">5x</div>
          <div className="breaker-label" style={{ marginTop: 4 }}>max leverage</div>
        </div>
      </div>
      {scenario.result.total_bad_debt > 0 && (
        <div style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--color-danger)" }}>
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
    <div className="surface-card">
      <div className="card-header">
        <span className="card-title">Simulation Summary</span>
      </div>
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Liquidations</div>
          <div className={`stat-value ${result.num_liquidated > 0 ? "text-danger" : "text-safe"}`}>
            {result.num_liquidated} / {snapshot.positions.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Losses</div>
          <div className={`stat-value ${result.total_losses > 0 ? "text-warning" : "text-safe"}`}>
            {formatUsd(result.total_losses)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bad Debt</div>
          <div className={`stat-value ${result.total_bad_debt > 0 ? "text-danger" : "text-safe"}`}>
            {formatUsd(result.total_bad_debt)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Risk Score</div>
          <div className={`stat-value ${formatRiskScore(result.risk_score) >= 70 ? "text-danger" : formatRiskScore(result.risk_score) >= 40 ? "text-warning" : "text-safe"}`}>
            {formatRiskScore(result.risk_score).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Insurance Fund Bar */}
      <div className="insurance-bar">
        <div className="stat-label">Insurance Fund Capacity</div>
        <div className="insurance-track">
          <div
            className="insurance-fill"
            style={{
              width: `${Math.max(0, insurancePct)}%`,
              backgroundColor: insuranceColor,
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

  const { isDark, toggleTheme } = useTheme();

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
          <div className="header-logo"><ShieldAlertIcon /></div>
          <div>
            <div className="header-title">Proof of Panic</div>
            <div className="header-subtitle">ZK-Verified Adversarial Risk Engine</div>
          </div>
        </div>
        <div className="header-actions">
          <div className="header-status">
            <span className={`status-dot ${cbActive ? "danger" : "safe"}`} />
            <span>{cbActive ? "EMERGENCY MODE" : "MONITORING"}</span>
          </div>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Scenario Selector */}
      <div className="scenario-selector">
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
              <div style={{ marginBottom: "1rem", fontFamily: "var(--font-sans)", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
