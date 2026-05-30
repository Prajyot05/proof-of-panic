#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Run Simulator
# ═══════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SNAPSHOT="${1:-$SCRIPT_DIR/demo-snapshot.json}"
OUTPUT_DIR="$ROOT_DIR/outputs"
SHOCK_BPS="${2:-3000}"
SHOCK_UP="${3:-false}"

echo ""
cargo run --release -p panic-simulator -- \
    --snapshot "$SNAPSHOT" \
    --output "$OUTPUT_DIR" \
    --shock-bps "$SHOCK_BPS" \
    $( [ "$SHOCK_UP" = "true" ] && echo "--shock-up" )
echo ""
