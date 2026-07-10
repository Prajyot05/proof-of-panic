import { Code, BookOpen, Terminal, Network, Search, Video } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="global-footer" style={{ borderTop: "1px solid var(--border-subtle)", padding: "3rem 2rem", background: "var(--bg-primary)", marginTop: "4rem" }}>
      <div className="footer-content" style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>

        <div className="footer-brand" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/logo.png" alt="Logo" style={{ width: 24, height: 24 }} />
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "1.1rem" }}>Proof of Panic</span>
          </div>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>A ZK-verified adversarial risk engine for Solana perpetual protocols.</span>
          <div className="tech-stack" style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "1rem" }}>
            <span>Solana</span> • <span>SP1</span> • <span>Rust</span> • <span>Next.js</span>
          </div>
        </div>

        <div className="footer-links" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Product</h4>
          <Link href="/architecture" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><BookOpen size={14} /> Whitepaper</Link>
          <Link href="/integrate" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Terminal size={14} /> Integration Guide</Link>
          <Link href="/proof-explorer" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Search size={14} /> Proof Explorer</Link>
        </div>

        <div className="footer-links" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resources</h4>
          <a href="https://github.com/Prajyot05/proof-of-panic" target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Code size={14} /> GitHub Repository</a>
          <a href="https://drive.google.com/file/d/1Xuh9zH561ck19S0cgO5S206QkXNkmGCy/view?usp=drive_link" target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Video size={14} /> Demo Video</a>
        </div>

      </div>
      {/* <div style={{ maxWidth: "1200px", margin: "3rem auto 0", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
        <span>Built for Superteam Fellowship 6</span>
        <span>All rights reserved to Proof of Panic</span>
      </div> */}
    </footer>
  );
}
