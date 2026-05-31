import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenarioId } = body;

    if (!scenarioId) {
      return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });
    }

    // Artificially simulate the latency of downloading state + running the Rust simulator
    // so the UI "Run Simulation" feels like it's doing real work.
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Load the pre-computed scenario results
    const scenarioDir = path.join(process.cwd(), "public", "scenarios", scenarioId);
    
    try {
      const resultsPath = path.join(scenarioDir, "results.json");
      const resultsData = await fs.readFile(resultsPath, "utf-8");
      const results = JSON.parse(resultsData);

      const snapshotPath = path.join(scenarioDir, "snapshot.json");
      const snapshotData = await fs.readFile(snapshotPath, "utf-8");
      const snapshot = JSON.parse(snapshotData);

      return NextResponse.json({
        success: true,
        scenarioId,
        snapshot,
        result: results
      });
    } catch (e) {
      console.error("Failed to load scenario data:", e);
      return NextResponse.json({ error: "Scenario artifacts not found" }, { status: 404 });
    }
  } catch (error: any) {
    console.error("Simulation API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
