#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Run Simulator
# ═══════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SNAPSHOT="${1:-$SCRIPT_DIR/demo-snapshot.json}"
OUTPUT_DIR="$ROOT_DIR/circuits/panic_proof"
SHOCK_BPS="${2:-3000}"

echo ""
cargo run --release -p panic-simulator -- \
    --snapshot "$SNAPSHOT" \
    --output "$OUTPUT_DIR" \
    --shock-bps "$SHOCK_BPS"
echo ""
