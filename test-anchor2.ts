import BN from "bn.js";
import { PublicValuesLayout } from "@proof-of-panic/sdk";

const stateHash = new Array(32).fill(0);
const shockDirectionUp = true;
const riskScore = 771000;
const badDebt = 0;
const numLiquidated = 2;

const publicValues = {
  stateHash,
  schemaVersion: 1,
  preShockPrice: new BN(150_000_000), 
  postShockPrice: new BN(120_000_000), 
  shockBps: new BN(2000),
  shockDirectionUp: shockDirectionUp ? 1 : 0,
  maintenanceMarginBps: new BN(500),
  liquidationFeeBps: new BN(100),
  liquidationTargetMarginBps: new BN(1000),
  circuitBreakerThreshold: new BN(40_000_000),
  insuranceFund: new BN(1_000_000_000_000),
  badDebt: new BN(badDebt),
  riskScore: new BN(riskScore),
  numLiquidated: new BN(numLiquidated),
};

try {
  const buffer = Buffer.alloc(1000);
  const len = PublicValuesLayout.encode(publicValues, buffer);
  console.log("Encoded length:", len);
} catch (e) {
  console.error("Encode Error:", e);
}
