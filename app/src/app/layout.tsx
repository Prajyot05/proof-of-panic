import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof of Panic — War Room",
  description: "ZK-verified adversarial risk engine for Solana perpetual protocols. Real-time visualization of liquidation cascades, protocol solvency, and autonomous circuit breakers.",
  keywords: ["Solana", "ZK", "zero-knowledge", "perpetuals", "risk engine", "liquidation", "DeFi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
