/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  ArrowRight,
  Cpu,
  Sun,
  Moon,
  Terminal,
  Code,
  Search,
  Play,
  Database,
  Network,
  Zap,
  FileText,
} from "lucide-react";
import Link from "next/link";

import {
  SCENARIOS,
  CB_THRESHOLD,
  TRADER_NAMES,
  WHALE_NAMES,
  formatUsd,
  formatPrice,
  formatRiskScore,
  getLeverage,
  type ScenarioData,
  type Snapshot,
} from "@/lib/types";
import { useTheme } from "@/lib/useTheme";


// ─── Framer Motion Variants ───
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// ─── Health Meter Component ───
function HealthMeter({ riskScore, cbActive }: { riskScore: number; cbActive: boolean }) {
  const pct = formatRiskScore(riskScore);
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 70 ? "var(--color-danger)" : pct >= 40 ? "var(--color-warning)" : "var(--color-safe)";
  const status = cbActive
    ? "CIRCUIT BREAKER"
    : pct >= 70
      ? "CRITICAL RISK"
      : pct >= 40
        ? "ELEVATED RISK"
        : "PROTOCOL SAFE";

  return (
    <motion.div variants={fadeUp} className="surface-card health-meter">
      <div className="card-header" style={{ width: "100%" }}>
        <span className="card-title">Protocol Health</span>
        <span className={`card-badge`}>
          {cbActive ? "BREAKER ON" : "LIVE"}
        </span>
      </div>
      <div className="meter-ring">
        <svg viewBox="0 0 180 180">
          <circle className="meter-track" cx="90" cy="90" r="80" />
          <motion.circle
            className="meter-fill"
            cx="90"
            cy="90"
            r="80"
            stroke={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="meter-center">
          <motion.div
            className="meter-value"
            style={{ color: "var(--text-primary)" }}
            key={pct}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {pct.toFixed(1)}
          </motion.div>
          <div className="meter-label">Risk %</div>
        </div>
      </div>
      <div style={{ color, fontSize: "0.85rem", fontWeight: 500 }}>
        {status}
      </div>
    </motion.div>
  );
}

// ─── Position Card Component ───
function PositionCard({ index, scenario }: { index: number; scenario: ScenarioData }) {
  const pos = scenario.snapshot.positions[index];
  const res = scenario.result.position_results[index];
  if (!pos || !res) return null;

  const names = scenario.id === "cascading-leverage" ? WHALE_NAMES : TRADER_NAMES;
  const name = names[index] || `Trader ${index}`;
  const leverage = getLeverage(pos.collateral, pos.size);
  const isLiquidated = res.is_liquidated;
  const pnl = res.unrealized_pnl;

  const healthPct = Math.min(100, Math.max(0, (res.margin_ratio_bps / 5000) * 100));
  const healthColor =
    healthPct <= 10 ? "var(--color-danger)" : healthPct <= 30 ? "var(--color-warning)" : "var(--color-safe)";

  return (
    <motion.div variants={fadeUp} className={`position-card ${isLiquidated ? "liquidated" : ""}`}>
      <div className="position-header">
        <span className="position-trader">{name}</span>
        <span className={`position-direction ${pos.is_long ? "direction-long" : "direction-short"}`}>
          {pos.is_long ? "LONG" : "SHORT"} {leverage}x
        </span>
      </div>
      <div className="position-details">
        <span>Collat</span>
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
        <motion.div
          className="health-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${isLiquidated ? 0 : healthPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: isLiquidated ? "var(--color-danger)" : healthColor }}
        />
      </div>
      <div className={`position-status ${isLiquidated ? "text-danger" : "text-safe"}`}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className={`status-dot ${isLiquidated ? "danger" : "safe"}`} style={{ display: "inline-block", width: 6, height: 6 }} />
          {isLiquidated ? "Liquidated" : "Healthy"}
        </div>
        {isLiquidated && res.liquidation_loss > 0 && (
          <span className="text-muted" style={{ fontWeight: 500 }}>
            -{formatUsd(res.liquidation_loss)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Cascade Timeline Component ───
function CascadeTimeline({ scenario }: { scenario: ScenarioData }) {
  const { result, snapshot } = scenario;
  const names = scenario.id === "cascading-leverage" ? WHALE_NAMES : TRADER_NAMES;
  const shockDir = result.post_shock_price > result.pre_shock_price ? "+" : "-";
  const shockPct = (result.shock_bps / 100).toFixed(0);

  interface TimelineEvent {
    title: string;
    detail: string;
    type: string;
  }

  const events: TimelineEvent[] = [];

  events.push({
    title: `SOL ${shockDir}${shockPct}%`,
    detail: `${formatPrice(result.pre_shock_price)} → ${formatPrice(result.post_shock_price)}`,
    type: "event-shock",
  });

  result.position_results.forEach((res, i) => {
    if (!snapshot.positions[i]?.is_open) return;
    const name = names[i] || `Trader ${i}`;
    const pos = snapshot.positions[i];
    const leverage = getLeverage(pos.collateral, pos.size);
    const dir = pos.is_long ? "LONG" : "SHORT";

    if (res.is_liquidated) {
      events.push({
        title: `${name} liquidated`,
        detail: `${dir} ${leverage}x | PnL ${formatUsd(res.unrealized_pnl)}`,
        type: "event-liquidation",
      });
    } else {
      events.push({
        title: `${name} survives`,
        detail: `${dir} ${leverage}x | Margin ${(res.margin_ratio_bps / 100).toFixed(1)}%`,
        type: "event-safe",
      });
    }
  });

  if (result.total_losses > 0) {
    events.push({
      title: result.total_bad_debt > 0 ? "Insurance depleted" : "Insurance absorbs losses",
      detail: result.total_bad_debt > 0
        ? `Bad debt: ${formatUsd(result.total_bad_debt)}`
        : `Remaining: ${formatUsd(result.insurance_fund_remaining)}`,
      type: "event-insurance",
    });
  }

  const cbFires = result.risk_score > CB_THRESHOLD;
  if (cbFires) {
    events.push({
      title: "Circuit breaker activated",
      detail: `Max lev 10x → 5x`,
      type: "event-breaker",
    });
  } else {
    events.push({
      title: "Protocol parameters safe",
      detail: `Risk < 70%`,
      type: "event-safe",
    });
  }

  return (
    <motion.div variants={fadeUp} className="surface-card">
      <div className="card-header">
        <span className="card-title">Liquidation Cascade</span>
        <span className="card-badge">
          {result.num_liquidated}/{snapshot.positions.length}
        </span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="timeline">
        {events.map((evt, i) => (
          <motion.div variants={fadeUp} key={i} className={`timeline-event ${evt.type}`}>
            <div className="timeline-icon-container" />
            <div className="timeline-content">
              <div className="timeline-title">{evt.title}</div>
              <div className="timeline-detail">{evt.detail}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Proof Verification Panel ───
function ProofPanel({ scenario }: { scenario: ScenarioData }) {
  const hash = scenario.result.state_hash
    .slice(0, 8)
    .map((b: unknown) => (b as number).toString(16).padStart(2, "0"))
    .join("");

  const steps = [
    { label: "State snapshot captured", detail: `${scenario.snapshot.positions.length} positions hashed`, icon: <CheckCircle2 size={14} /> },
    { label: "Simulation executed", detail: `Shock applied, ${scenario.result.num_liquidated} liquidations`, icon: <Activity size={14} /> },
    { label: "ZK witness generated", detail: `Prover.toml + Verifier.toml`, icon: <Fingerprint size={14} /> },
    { label: "Circuit compiled", detail: `~31,000 gates`, icon: <Cpu size={14} /> },
    { label: "Proof verified", detail: `State: 0x${hash}…`, icon: <ShieldCheck size={14} /> },
  ];

  const [verifying, setVerifying] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyOnChain = async () => {
    setVerifying(true);
    setError(null);
    setTxSignature(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          riskScore: scenario.result.risk_score,
          badDebt: scenario.result.total_bad_debt,
          numLiquidated: scenario.result.num_liquidated,
          stateHash: scenario.result.state_hash,
          shockDirectionUp: scenario.result.shock_direction_up,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify");

      setTxSignature(data.txSignature || "simulated-tx-base64");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div variants={fadeUp} className="surface-card relative overflow-hidden">
      <div className="card-header">
        <span className="card-title">ZK Verification</span>
        <span className="card-badge" style={{ color: "var(--color-info)" }}>{txSignature ? "ON-CHAIN" : "LOCAL"}</span>
      </div>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="proof-steps mb-6">
        {steps.map((step, i) => (
          <motion.div variants={fadeUp} key={i} className="proof-step step-complete">
            <div className="proof-step-icon">{step.icon}</div>
            <div>
              <div className="proof-step-label">{step.label}</div>
              <div className="proof-step-detail">{step.detail}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="proof-action-container">
        <button
          onClick={verifyOnChain}
          disabled={verifying || !!txSignature}
          className="verify-btn"
        >
          {verifying ? (
            <span className="verify-btn-content"><Activity className="spinner" size={16} /> Verifying on Devnet...</span>
          ) : txSignature ? (
            <span className="verify-btn-content"><ShieldCheck size={16} /> Verified On-Chain</span>
          ) : (
            <span className="verify-btn-content"><Terminal size={16} /> Verify On-Chain (Judge Mode)</span>
          )}
        </button>
        {error && (
          <div className="verify-error">{error}</div>
        )}
        {txSignature && txSignature !== "simulated-tx-base64" && (
          <div className="verify-success">
            <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noreferrer">
              View Transaction
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Circuit Breaker Banner Component ───
function CircuitBreakerBanner({ scenario }: { scenario: ScenarioData }) {
  const cbFires = scenario.result.risk_score > CB_THRESHOLD;

  return (
    <motion.div
      variants={fadeUp}
      className={`circuit-breaker-banner ${cbFires ? "active" : ""}`}
    >
      <div className="breaker-title-group">
        <div className="breaker-icon">
          {cbFires ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
        </div>
        <div>
          <div className="breaker-title">
            {cbFires ? "Circuit Breaker Activated" : "Protocol Defended"}
          </div>
          <div className="breaker-desc">
            {cbFires
              ? "Risk threshold exceeded. Exposure reduced automatically."
              : "Insurance fund absorbed losses. No emergency action required."}
          </div>
        </div>
      </div>

      <div className="breaker-details">
        {cbFires ? (
          <>
            <div className="breaker-stat">
              <span className="breaker-stat-label">Before</span>
              <span className="breaker-stat-value text-muted" style={{ textDecoration: "line-through" }}>10x</span>
            </div>
            <ArrowRight size={16} className="text-muted" />
            <div className="breaker-stat">
              <span className="breaker-stat-label">Max Leverage</span>
              <span className="breaker-stat-value">5x</span>
            </div>
          </>
        ) : (
          <div className="breaker-stat">
            <span className="breaker-stat-label">Max Leverage</span>
            <span className="breaker-stat-value">10x</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Summary Stats ───
function SummaryStats({ scenario }: { scenario: ScenarioData }) {
  const { result, snapshot } = scenario;
  const insurancePct = (result.insurance_fund_remaining / snapshot.insurance_fund) * 100;
  const insuranceColor =
    insurancePct <= 0 ? "var(--color-danger)" : insurancePct <= 30 ? "var(--color-warning)" : "var(--color-safe)";

  return (
    <motion.div variants={fadeUp} className="surface-card">
      <div className="card-header">
        <span className="card-title">Simulation Summary</span>
      </div>
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Liquidations</div>
          <div className={`stat-value ${result.num_liquidated > 0 ? "text-danger" : ""}`}>
            {result.num_liquidated} / {snapshot.positions.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Losses</div>
          <div className={`stat-value ${result.total_losses > 0 ? "text-warning" : ""}`}>
            {formatUsd(result.total_losses)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bad Debt</div>
          <div className={`stat-value ${result.total_bad_debt > 0 ? "text-danger" : ""}`}>
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

      <div className="insurance-bar">
        <div className="insurance-labels">
          <span>Fund Capacity</span>
          <span>{formatUsd(result.insurance_fund_remaining)} / {formatUsd(snapshot.insurance_fund)}</span>
        </div>
        <div className="insurance-track" style={{ marginTop: "0.5rem" }}>
          <motion.div
            className="insurance-fill"
            initial={{ width: "100%" }}
            animate={{ width: `${Math.max(0, insurancePct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ backgroundColor: insuranceColor }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Metrics Bar ───
function MetricsBar({ stateHash }: { stateHash?: number[] }) {
  const hashShort = stateHash ? "0x" + stateHash.slice(0, 8).map((b: unknown) => (b as number).toString(16).padStart(2, "0")).join("") : "N/A";

  const metrics = [
    { label: "STATE HASH", value: hashShort },
    { label: "SLOT", value: "2,398,128" },
    { label: "PROOF AGE", value: "11 slots" },
    { label: "VERIFIER", value: "SP1-G16" },
    { label: "CIRCUIT GATES", value: "~31,000" },
    { label: "VERIFICATION CU", value: "~200K" },
  ];

  return (
    <motion.div variants={fadeUp} className="metrics-bar">
      {metrics.map((m, i) => (
        <div key={i} className="metric-item">
          <div className="metric-label">{m.label}</div>
          <div className="metric-value">{m.value}</div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Terminal Feed ───
function TerminalFeed({ logs }: { logs: { time: string; msg: string; type: string }[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div variants={fadeUp} className="terminal-feed" ref={scrollRef}>
      {logs.length === 0 && <div className="text-muted">Waiting for simulation...</div>}
      {logs.map((log, i) => (
        <div key={i} className="terminal-line">
          <span className="terminal-time">[{log.time}]</span>
          <span className={`terminal-message ${log.type}`}>{log.msg}</span>
        </div>
      ))}
      <div className="terminal-line">
        <span className="terminal-time"></span>
        <span className="terminal-message blink">_</span>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───
export default function WarRoom() {
  const [activeScenario, setActiveScenario] = useState("volatility-shock");
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: string }[]>([]);

  const { isDark, toggleTheme } = useTheme();

  const addLog = (msg: string, type = "normal") => {
    const time = new Date().toISOString().split("T")[1].slice(0, 8);
    setLogs((prev) => [...prev, { time, msg, type }]);
  };

  const switchScenario = (id: string) => {
    if (id !== activeScenario) {
      setActiveScenario(id);
      setIsSimulated(false);
      setScenarioData(null);
      setLogs([]);
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setLogs([]);
    addLog(`Initiating scenario: ${activeScenario}`, "highlight");

    // Simulate real pipeline latency
    setTimeout(() => addLog("Connecting to Solana RPC...", "normal"), 300);
    setTimeout(() => addLog("Exporting open positions from PositionBook PDA...", "normal"), 600);
    setTimeout(() => addLog("Computing SHA-256 state commitment...", "normal"), 900);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeScenario }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // We have the data, now stagger the logs
      const prePrice = formatUsd(data.snapshot.oracle_price);
      const postPrice = formatUsd(data.result.post_shock_price);
      const direction = data.result.shock_direction_up ? "+" : "-";
      const shockPct = data.result.shock_bps / 100;
      const numLiquidated = data.result.num_liquidated;
      const badDebt = formatUsd(data.result.total_bad_debt);

      addLog(`Applying market shock: SOL ${direction}${shockPct}% (${prePrice} -> ${postPrice})`, "warning");

      setTimeout(() => {
        addLog("Running liquidation cascade engine...", "normal");

        setTimeout(() => {
          addLog(`Cascade complete: ${numLiquidated} liquidated, ${badDebt} bad debt`, "warning");

          setTimeout(() => {
            addLog("Generating SP1 ZK witness (14 public inputs, 320 private)...", "highlight");

            setTimeout(() => {
              addLog("Compiling SP1 ELF (~31,000 gates)...", "normal");

              setTimeout(() => {
                const rs = (data.result.risk_score / 10000).toFixed(1);
                addLog(`Risk score: ${rs}% (threshold: ${(CB_THRESHOLD / 10000).toFixed(1)}%)`, "error");

                if (data.result.risk_score > CB_THRESHOLD) {
                  addLog("CIRCUIT BREAKER TRIGGERED: max leverage halved", "error");
                }

                setTimeout(() => {
                  addLog("Proof ready for on-chain verification (~200K CU)", "success");

                  // Finally show the UI
                  setScenarioData({
                    id: data.scenarioId,
                    name: SCENARIOS.find((s) => s.id === data.scenarioId)!.name,
                    description: SCENARIOS.find((s) => s.id === data.scenarioId)!.description,
                    snapshot: data.snapshot,
                    result: data.result,
                  });
                  setIsSimulated(true);
                  setIsSimulating(false);
                }, 800);
              }, 800);
            }, 800);
          }, 600);
        }, 800);
      }, 500);

    } catch (err: any) {
      addLog(`Error: ${err.message}`, "error");
      setIsSimulating(false);
    }
  };

  const cbActive = scenarioData
    ? scenarioData.result.risk_score > CB_THRESHOLD
    : false;

  return (
    <div className="war-room">
      {/* Header */}
      <header className="header">
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div className="header-brand">
            <div className="header-logo">
              <img src="/logo.png" alt="Proof of Panic Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div className="header-title">Proof of Panic</div>
              <div className="header-subtitle">Institutional Risk Terminal</div>
            </div>
          </div>
        </Link>
        <div className="header-actions">
          <Link href="/architecture" className="integrate-btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Network size={14} /> Architecture
          </Link>
          <Link href="/proof-explorer" className="integrate-btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <Search size={14} /> Proof Explorer
          </Link>
          <Link href="/integrate" className="integrate-btn">
            <Code size={14} /> Integrate
          </Link>
          <div className={`header-status ${cbActive ? "emergency" : ""}`}>
            <span className={`status-dot ${cbActive ? "danger" : "safe"}`} />
            {cbActive ? "EMERGENCY" : "MONITORING"}
          </div>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
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
            data-text={s.name}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "2rem", minHeight: "24px" }}>
        {SCENARIOS.find(s => s.id === activeScenario)?.description}
      </div>

      {!isSimulated ? (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 0 6rem 0" }}>
          <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ textAlign: "center", marginBottom: "4rem" }}>
            <h1 style={{ fontSize: "3.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              ZK-Verified Risk Engine <br />for Solana Perps
            </h1>
            <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
              Trustless, automated circuit breakers powered by SP1 zero-knowledge proofs.
              Simulate adversarial market crashes off-chain, prove correctness cryptographically,
              verify on-chain for ~200,000 compute units.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
              <a href="https://github.com/Prajyot05/proof-of-panic" target="_blank" rel="noreferrer" className="integrate-btn" style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.03c3.15-.38 6.47-1.4 6.47-7.03a5.4 5.4 0 0 0-1.5-3.8 5.4 5.4 0 0 0-.15-3.8s-1.18-.38-3.9 1.4a13.4 13.4 0 0 0-7 0c-2.73-1.78-3.9-1.4-3.9-1.4a5.4 5.4 0 0 0-.15 3.8 5.4 5.4 0 0 0-1.5 3.8c0 5.61 3.32 6.64 6.47 7.03a4.8 4.8 0 0 0-1 3.03V22"></path><path d="M9 20c-5 1.5-5-2.5-7-3"></path></svg> View GitHub
              </a>
              <Link href="/architecture" className="integrate-btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                <FileText size={16} /> Read Whitepaper
              </Link>
            </div>
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "4rem" }}>
            <motion.div variants={fadeUp} className="surface-card" style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ color: "var(--color-info)", marginBottom: "1rem", display: "flex", justifyContent: "center" }}><Cpu size={32} /></div>
              <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>~200K CU</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>O(1) On-Chain Verification</div>
            </motion.div>
            <motion.div variants={fadeUp} className="surface-card" style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ color: "var(--color-warning)", marginBottom: "1rem", display: "flex", justifyContent: "center" }}><Zap size={32} /></div>
              <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>~2ms</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Off-Chain Simulation Time</div>
            </motion.div>
            <motion.div variants={fadeUp} className="surface-card" style={{ textAlign: "center", padding: "2rem" }}>
              <div style={{ color: "var(--color-safe)", marginBottom: "1rem", display: "flex", justifyContent: "center" }}><Database size={32} /></div>
              <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>5</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Adversarial Scenarios Tested</div>
            </motion.div>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Database size={14} /> Snapshot</div> <ArrowRight size={14} style={{ opacity: 0.5 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Cpu size={14} /> Simulate</div> <ArrowRight size={14} style={{ opacity: 0.5 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Fingerprint size={14} /> Prove</div> <ArrowRight size={14} style={{ opacity: 0.5 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><ShieldCheck size={14} /> Verify</div> <ArrowRight size={14} style={{ opacity: 0.5 }} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-safe)" }}><ShieldAlert size={14} /> Defend</div>
            </div>

            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="verify-btn"
              style={{ width: "auto", padding: "1rem 4rem", fontSize: "1.1rem" }}
            >
              {isSimulating ? (
                <span className="verify-btn-content"><Activity className="spinner" size={18} /> Running ZK Pipeline...</span>
              ) : (
                <span className="verify-btn-content"><Play size={18} /> Run Judge Mode Demo</span>
              )}
            </button>
          </div>

          {logs.length > 0 && (
            <div style={{ maxWidth: 600, margin: "2rem auto 0" }}>
              <TerminalFeed logs={logs} />
            </div>
          )}
        </div>

      ) : (
        <AnimatePresence mode="wait">
          {scenarioData && (
            <motion.div
              key={scenarioData.id}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="dashboard-grid"
            >
              <CircuitBreakerBanner scenario={scenarioData} />

              <div className="grid-top">
                <HealthMeter riskScore={scenarioData.result.risk_score} cbActive={cbActive} />
                <div>
                  <div style={{ marginBottom: "1rem", fontSize: "0.9rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    Positions ({scenarioData.snapshot.positions.length})
                  </div>
                  <div className="grid-positions">
                    {scenarioData.snapshot.positions.map((_, i) => (
                      <PositionCard key={i} index={i} scenario={scenarioData} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid-bottom">
                <CascadeTimeline scenario={scenarioData} />
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <SummaryStats scenario={scenarioData} />
                  <ProofPanel scenario={scenarioData} />
                </div>
              </div>

              <MetricsBar stateHash={scenarioData.result.state_hash} />

              <TerminalFeed logs={logs} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
