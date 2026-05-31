"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Code, Cpu, ShieldCheck, Copy, Check, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useTheme } from "@/lib/useTheme";

const CPI_CODE = `use anchor_lang::prelude::*;
use proof_of_panic::state::GlobalState;

// ... Your Protocol Logic ...

#[derive(Accounts)]
pub struct YourRiskSensitiveInstruction<'info> {
    // Other accounts...
    
    #[account(
        seeds = [b"global_state"],
        bump,
        seeds::program = proof_of_panic::ID
    )]
    pub risk_engine_state: Account<'info, GlobalState>,
}

pub fn execute_trade(ctx: Context<YourRiskSensitiveInstruction>) -> Result<()> {
    // 1. Check if the Proof of Panic circuit breaker is active!
    let risk_state = &ctx.accounts.risk_engine_state;
    
    if risk_state.circuit_breaker_active {
        // Option A: Revert the transaction
        // return err!(YourError::CircuitBreakerActive);
        
        // Option B: Apply safe mode constraints (e.g. max leverage / 2)
        let max_leverage = risk_state.max_leverage;
        msg!("Running in SAFE MODE with max leverage {}x", max_leverage / 1_000_000);
        // ... enforce safety logic
    }
    
    // ... execute trade
    Ok(())
}`;

const highlightRust = (code: string) => {
  const highlighted = code
    .replace(/(pub fn|fn|pub struct|struct|use|impl|for|let|mut|if|else|match|return)\b/g, '<span style="color: #ff7b72">$1</span>')
    .replace(/(Result|Context|Account|GlobalState|YourRiskSensitiveInstruction|Option|String)\b/g, '<span style="color: #79c0ff">$1</span>')
    .replace(/(\/\/.*)/g, '<span style="color: #8b949e">$1</span>')
    .replace(/(\bmsg!\b|\brequire!\b|\berr!\b)/g, '<span style="color: #d2a8ff">$1</span>')
    .replace(/#\[(.*?)\]/g, '<span style="color: #d2a8ff">#[$1]</span>');
  return { __html: highlighted };
};

const highlightTS = (code: string) => {
  const highlighted = code
    .replace(/(import|from|const|let|var|if|else|await|async|new|console)\b/g, '<span style="color: #ff7b72">$1</span>')
    .replace(/(\/\/.*)/g, '<span style="color: #8b949e">$1</span>')
    .replace(/(["'`].*?["'`])/g, '<span style="color: #a5d6ff">$1</span>');
  return { __html: highlighted };
};

export default function IntegratePage() {
  const [copiedRust, setCopiedRust] = useState(false);
  const [copiedTS, setCopiedTS] = useState(false);
  const [activeTab, setActiveTab] = useState<"rust" | "ts">("rust");
  const { isDark, toggleTheme } = useTheme();

  const TS_CODE = `npm install @proof-of-panic/sdk

import { ProofOfPanicClient } from "@proof-of-panic/sdk";

const client = new ProofOfPanicClient(provider);
const { globalStatePda } = client.getPDAs();

const state = await client.program.account.globalState.fetch(globalStatePda);
if (state.circuitBreakerActive) {
  console.log("MARKET IS UNSAFE. Risk Score:", state.lastRiskScore.toString());
}`;

  const copyCode = (code: string, type: "rust" | "ts") => {
    navigator.clipboard.writeText(code);
    if (type === "rust") {
      setCopiedRust(true);
      setTimeout(() => setCopiedRust(false), 2000);
    } else {
      setCopiedTS(true);
      setTimeout(() => setCopiedTS(false), 2000);
    }
  };

  return (
    <div className="war-room">
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
              <div className="header-subtitle">Integration Guide</div>
            </div>
          </div>
        </Link>
        <div className="header-actions">
          <Link href="/" className="integrate-btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <button onClick={toggleTheme} className="theme-toggle">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="integrate-header"
      >
        <h1 className="integrate-title">
          Integrate Proof of Panic
        </h1>
        <p className="integrate-subtitle">
          Protect your perpetual exchange or lending protocol by hooking into our zero-knowledge risk engine. You do not need to run your own keeper bots for your protocol anymore. Just read our on-chain state to stay safe.
        </p>
      </motion.div>

      <div className="integrate-grid">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="surface-card"
        >
          <div className="card-header">
            <h2 className="card-title"><ShieldCheck className="icon-blue" size={20} /> How it Works</h2>
          </div>
          <div className="timeline" style={{ marginTop: "1rem" }}>
            <div className="timeline-event event-shock">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Risk Oracle Monitoring</div>
                <div className="timeline-detail">Our network of keepers simulates market crashes off-chain. If they prove a SOL crash causes insolvency, they generate an SP1 ZK-proof.</div>
              </div>
            </div>
            <div className="timeline-event event-breaker">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Circuit Breaker Activation</div>
                <div className="timeline-detail">When a valid proof is verified on-chain via the Anchor program, our circuit_breaker_active flag is flipped to true.</div>
              </div>
            </div>
            <div className="timeline-event event-safe">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Protocol Integration (You)</div>
                <div className="timeline-detail">Your protocol reads this flag via CPI or TS SDK. If active, you automatically pause operations or enforce tighter margin requirements.</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="surface-card"
        >
          <div className="card-header" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setActiveTab("rust")}
                style={{
                  background: "transparent", border: "none", color: activeTab === "rust" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: activeTab === "rust" ? 600 : 400, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"
                }}
              >
                <Code size={18} className={activeTab === "rust" ? "icon-emerald" : ""} /> Anchor CPI
              </button>
              <button
                onClick={() => setActiveTab("ts")}
                style={{
                  background: "transparent", border: "none", color: activeTab === "ts" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: activeTab === "ts" ? 600 : 400, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"
                }}
              >
                <Cpu size={18} className={activeTab === "ts" ? "icon-blue" : ""} /> Typescript SDK
              </button>
            </div>
            <button
              onClick={() => copyCode(activeTab === "rust" ? CPI_CODE : TS_CODE, activeTab)}
              className="copy-btn"
              title="Copy code"
            >
              {(activeTab === "rust" ? copiedRust : copiedTS) ? <Check size={16} className="icon-emerald" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="code-block-container" style={{ background: "#0d1117", minHeight: "350px" }}>
            {activeTab === "rust" ? (
              <code dangerouslySetInnerHTML={highlightRust(CPI_CODE)} />
            ) : (
              <code dangerouslySetInnerHTML={highlightTS(TS_CODE)} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
