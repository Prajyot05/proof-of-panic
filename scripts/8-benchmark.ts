/**
 * Proof of Panic — Benchmark Harness
 *
 * Runs the simulator across all canonical scenarios and records timing
 * and output metadata for reproducible benchmark reporting.
 */

import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(ROOT, "outputs/benchmarks");
const SIM_BIN = resolve(ROOT, "target/release/panic-simulator");

const scenarios = [
  { id: "volatility-shock", shockBps: 3000, shockUp: false },
  { id: "mild-correction", shockBps: 1000, shockUp: false },
  { id: "flash-crash", shockBps: 5000, shockUp: false },
  { id: "short-squeeze", shockBps: 4000, shockUp: true },
  { id: "cascading-leverage", shockBps: 3000, shockUp: false },
];

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const rows: Array<Record<string, unknown>> = [];

  for (const scenario of scenarios) {
    const scenarioDir = resolve(OUTPUT_DIR, scenario.id);
    mkdirSync(scenarioDir, { recursive: true });

    const start = process.hrtime.bigint();
    const command = existsSync(SIM_BIN) ? SIM_BIN : "cargo";
    const args = existsSync(SIM_BIN)
      ? [
          "--scenario",
          scenario.id,
          "--output",
          scenarioDir,
          "--shock-bps",
          String(scenario.shockBps),
          ...(scenario.shockUp ? ["--shock-up"] : []),
        ]
      : [
          "run",
          "--release",
          "-p",
          "panic-simulator",
          "--",
          "--scenario",
          scenario.id,
          "--output",
          scenarioDir,
          "--shock-bps",
          String(scenario.shockBps),
          ...(scenario.shockUp ? ["--shock-up"] : []),
        ];

    const run = spawnSync(command, args, { cwd: ROOT, encoding: "utf8" });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    if (run.status !== 0) {
      throw new Error(
        `Benchmark failed for ${scenario.id}: ${run.stderr || run.stdout}`,
      );
    }

    const result = JSON.parse(
      readFileSync(resolve(scenarioDir, "results.json"), "utf8"),
    );

    rows.push({
      scenario: scenario.id,
      elapsed_ms: Math.round(elapsedMs),
      positions: result.position_results.length,
      liquidated: result.num_liquidated,
      bad_debt: result.total_bad_debt,
      risk_score: result.risk_score,
      proof_size_bytes: 128,
      output_dir: scenarioDir,
    });
  }

  const report = {
    generated_at: new Date().toISOString(),
    target: "localnet / Apple Silicon",
    rows,
  };

  writeFileSync(
    resolve(OUTPUT_DIR, "benchmark-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    `Benchmark report written to ${resolve(OUTPUT_DIR, "benchmark-report.json")}`,
  );
}

main();
