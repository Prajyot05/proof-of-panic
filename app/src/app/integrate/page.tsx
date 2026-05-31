"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Code, Cpu, ShieldCheck, Copy, Check, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

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

export default function IntegratePage() {
  const [copied, setCopied] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CPI_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="war-room">
      <header className="header">
        <div className="header-brand">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="live-rpc-btn">
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
          </Link>
        </div>
        <div className="header-actions">
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
          <div className="timeline">
            <div className="timeline-event event-shock">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Risk Oracle</div>
                <div className="timeline-detail">Our network of keepers simulates market crashes. If they prove a SOL crash causes insolvency, they submit a ZK-proof.</div>
              </div>
            </div>
            <div className="timeline-event event-breaker">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Circuit Breaker Activation</div>
                <div className="timeline-detail">When a valid proof is verified on-chain, our circuit_breaker_active flag is flipped to true.</div>
              </div>
            </div>
            <div className="timeline-event event-safe">
              <div className="timeline-icon-container"></div>
              <div className="timeline-content">
                <div className="timeline-title">Protocol Integration</div>
                <div className="timeline-detail">Your protocol reads this flag. If active, you automatically pause operations or enforce tighter margin requirements.</div>
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
          <div className="card-header">
            <h2 className="card-title"><Code className="icon-emerald" size={20} /> Rust CPI Example</h2>
            <button 
              onClick={copyToClipboard}
              className="copy-btn"
              title="Copy code"
            >
              {copied ? <Check size={16} className="icon-emerald" /> : <Copy size={16} />}
            </button>
          </div>
          
          <div className="code-block-container">
            <code>{CPI_CODE}</code>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="surface-card"
      >
        <div className="card-header">
          <h2 className="card-title"><Cpu className="icon-blue" size={20} /> Typescript SDK</h2>
        </div>
        <p className="text-secondary" style={{ marginBottom: "1rem" }}>
          We also provide a fully-typed TypeScript SDK for reading risk state from your frontend or off-chain workers.
        </p>
        <div className="code-block-container">
          <code>
{`npm install @proof-of-panic/sdk

import { ProofOfPanicClient } from "@proof-of-panic/sdk";

const client = new ProofOfPanicClient(provider);
const { globalStatePda } = client.getPDAs();

const state = await client.program.account.globalState.fetch(globalStatePda);
if (state.circuitBreakerActive) {
  console.log("MARKET IS UNSAFE. Risk Score:", state.lastRiskScore.toString());
}`}
          </code>
        </div>
      </motion.div>
    </div>
  );
}
