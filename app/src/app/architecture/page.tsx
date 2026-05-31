"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Cpu, ShieldCheck, Zap, Server, Activity, Database, Key, Box, Fingerprint, Network, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/useTheme";
import { Sun, Moon } from "lucide-react";

// Framer Motion variants
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function ArchitecturePage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="war-room">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <img src="/logo.png" alt="Proof of Panic Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div className="header-title">Proof of Panic</div>
            <div className="header-subtitle">Architecture & Deep Dive</div>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/" className="integrate-btn" style={{ background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <motion.div 
        variants={staggerContainer} 
        initial="hidden" 
        animate="show"
        style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 0" }}
      >
        <motion.div variants={fadeUp} style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            The Engine Under the Hood
          </h1>
          <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", maxWidth: 700, margin: "0 auto", lineHeight: 1.6 }}>
            Proof of Panic is not just a dashboard. It's a full-stack, production-grade risk infrastructure layer built on SP1, Rust, and Solana. 
          </p>
        </motion.div>

        {/* Section 1: The Problem & Trilemma */}
        <motion.div variants={fadeUp} className="surface-card mb-8">
          <div className="card-header">
            <span className="card-title">The On-Chain Risk Trilemma</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginTop: "1rem" }}>
            <div>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
                Solana perpetual protocols face a critical tradeoff when designing risk engines and circuit breakers. You can typically only pick two:
              </p>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckIcon /> <b>Trustless:</b> No multi-sig or centralized admin</li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckIcon /> <b>Affordable:</b> Doesn't exceed 1.4M compute limit</li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckIcon /> <b>Scalable:</b> Supports 10,000+ open positions</li>
              </ul>
            </div>
            <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
              <h4 style={{ marginBottom: "1rem", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                Compute Unit Scaling
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span>On-Chain Simulation (100 pos)</span>
                  <span style={{ color: "var(--color-danger)" }}>~5,000,000 CU ❌</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "var(--color-danger)" }}></div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                  <span>ZK Verification (10,000 pos)</span>
                  <span style={{ color: "var(--color-safe)" }}>~200,000 CU ✅</span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--border-subtle)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: "15%", height: "100%", background: "var(--color-safe)" }}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 2: The Pipeline */}
        <motion.div variants={fadeUp} className="surface-card mb-8">
          <div className="card-header">
            <span className="card-title">The ZK Pipeline</span>
          </div>
          <div style={{ marginTop: "2rem" }}>
            <PipelineStep 
              number="1"
              title="Snapshot (Typescript Keeper)"
              icon={<Database size={20} />}
              description="A decentralized keeper network monitors the Pyth oracle. Upon a price shock, it reads the zero-copy PositionBook from Solana and generates a deterministic SHA-256 state hash."
            />
            
            <PipelineStep 
              number="2"
              title="Simulate (Rust Simulator)"
              icon={<Cpu size={20} />}
              description="The deterministic off-chain Rust simulator calculates the liquidation cascade, partial liquidations, and price impacts to determine the protocol's risk score."
              code={"let (position_results, post_shock_price) = evaluate_positions(\n    &mut positions,\n    shocked_price,\n    &risk_config,\n).expect(\"math overflow\");"}
            />

            <PipelineStep 
              number="3"
              title="Prove (SP1 zkVM)"
              icon={<Fingerprint size={20} />}
              description="The exact same Rust simulation is compiled to a RISC-V ELF and executed inside the SP1 zkVM. It generates a cryptographic proof that the math was executed correctly against the exact state hash."
              code={"// Inside SP1 zkVM Guest\nlet mut snapshot: Snapshot = sp1_zkvm::io::read::<Snapshot>();\nlet state_hash = compute_state_hash(&snapshot.positions);\n\n// Output the public values payload\nsp1_zkvm::io::commit_slice(&borsh::to_vec(&public_values).unwrap());"}
            />

            <PipelineStep 
              number="4"
              title="Verify & Defend (Anchor Program)"
              icon={<ShieldCheck size={20} />}
              description="The Anchor program dynamically hashes its own live state, validates it against the proof's public inputs, and verifies the SP1 Groth16 proof via CPI. If valid, the circuit breaker activates."
              code={"// 1. Hash the live on-chain state array\nlet positions_bytes = bytemuck::bytes_of(&position_book.positions);\nlet computed_state_hash = hash(positions_bytes).to_bytes();\n\n// 2. Cryptographically bind the ZK proof to the live state\nrequire!(\n    public_values.state_hash == computed_state_hash,\n    PanicError::StateHashMismatch\n);\n\n// 3. Trigger circuit breaker\nif public_values.risk_score > risk_config.circuit_breaker_threshold {\n    global_state.max_leverage /= 2; // Auto-deleveraging\n}"}
              isLast
            />
          </div>
        </motion.div>

        {/* Section 3: Threat Model */}
        <motion.div variants={fadeUp} className="surface-card mb-8">
          <div className="card-header">
            <span className="card-title">Threat Model Mitigations</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
            <ThreatCard 
              title="Stale State Submission"
              threat="Keeper submits valid ZK proof of insolvency using state from 10 blocks ago."
              mitigation="The ZK proof exposes the state_hash used during generation. The Anchor contract dynamically hashes the live PositionBook at the exact slot of execution. If they don't match, the transaction reverts."
            />
            <ThreatCard 
              title="Oracle Manipulation"
              threat="Attacker manipulates Pyth oracle to artificially trigger circuit breaker."
              mitigation="Pre-shock price in the ZK proof must exactly match the live on-chain Pyth oracle price during verification. Random liquidations cannot be spoofed."
            />
            <ThreatCard 
              title="Keeper Spam"
              threat="Keepers continuously submit identical ZK proofs to drain reward vault."
              mitigation="Enforced min_proof_interval_slots cooldown on-chain. Proofs submitted too early update state but receive no lamport payout."
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function CheckIcon() {
  return <div style={{ color: "var(--color-safe)", display: "flex", alignItems: "center" }}><CheckCircle2 size={16} /></div>;
}

function PipelineStep({ number, title, description, code, icon, isLast = false }: any) {
  return (
    <div style={{ display: "flex", gap: "1.5rem", position: "relative" }}>
      {/* Timeline connector */}
      {!isLast && (
        <div style={{ position: "absolute", left: 19, top: 40, bottom: -20, width: 2, background: "var(--border-subtle)", zIndex: 0 }}></div>
      )}
      
      {/* Number badge */}
      <div style={{ 
        width: 40, height: 40, borderRadius: "50%", background: "var(--bg-surface)", 
        border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", 
        justifyContent: "center", fontWeight: "bold", zIndex: 1, color: "var(--color-info)"
      }}>
        {icon}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : "3rem", paddingTop: "0.5rem" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Step {number}: {title}
        </h3>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: code ? "1rem" : 0 }}>
          {description}
        </p>
        
        {code && (
          <div style={{ 
            background: "var(--bg-inset)", padding: "1rem", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)", overflowX: "auto"
          }}>
            <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreatCard({ title, threat, mitigation }: { title: string, threat: string, mitigation: string }) {
  return (
    <div style={{ background: "var(--bg-inset)", borderRadius: "var(--radius-lg)", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
      <h4 style={{ marginBottom: "1rem", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <ShieldAlert size={16} style={{ color: "var(--color-warning)" }} /> {title}
      </h4>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-danger)", fontWeight: "bold", marginBottom: "0.2rem" }}>Attack Vector</div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{threat}</p>
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-safe)", fontWeight: "bold", marginBottom: "0.2rem" }}>Mitigation</div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{mitigation}</p>
      </div>
    </div>
  );
}
