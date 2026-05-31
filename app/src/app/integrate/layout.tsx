import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integration Guide - Proof of Panic",
  description: "Protect your perpetual exchange or lending protocol by hooking into our zero-knowledge risk engine.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
