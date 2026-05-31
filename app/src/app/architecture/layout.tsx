import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture - Proof of Panic",
  description: "Deep dive into the architecture, ZK pipeline, and security threat model of the Proof of Panic protocol.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
