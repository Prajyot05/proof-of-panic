import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof of Panic - War Room",
  description: "ZK-verified adversarial risk engine for Solana perpetual protocols. Scenario playback visualization of liquidation cascades, protocol solvency, and autonomous circuit breakers.",
  keywords: ["Solana", "ZK", "zero-knowledge", "perpetuals", "risk engine", "liquidation", "DeFi"],
  openGraph: {
    title: "Proof of Panic - War Room",
    description: "ZK-verified adversarial risk engine for Solana perpetual protocols.",
    url: "https://proof-of-panic.vercel.app",
    siteName: "Proof of Panic",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proof of Panic - War Room",
    description: "ZK-verified adversarial risk engine for Solana perpetual protocols.",
    images: ["/logo.png"],
  },
};

import { Footer } from "@/components/Footer";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Footer />
      </body>
    </html>
  );
}
