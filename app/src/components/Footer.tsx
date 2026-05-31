import { Code } from "lucide-react";

export function Footer() {
  return (
    <footer className="global-footer">
      <div className="footer-content">
        <div className="footer-left">
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Proof of Panic</span>
          <span style={{ color: "var(--text-secondary)" }}> Built for Superteam Fellowship 2025</span>
        </div>
        <div className="footer-right">
          <div className="tech-stack">
            <span>Solana</span> • <span>SP1</span> • <span>Rust</span> • <span>Next.js</span>
          </div>
          <a href="https://github.com/Prajyot05/proof-of-panic" target="_blank" rel="noreferrer" className="footer-link">
            <Code size={16} /> GitHub
          </a>

        </div>
      </div>
    </footer>
  );
}
