#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Generate ZK Proof (SP1)
# ═══════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SNAPSHOT="${1:-$ROOT_DIR/outputs/snapshot.json}"
OUTPUT_DIR="$ROOT_DIR/outputs/sp1"
SHOCK_BPS="${2:-3000}"
SHOCK_UP="${3:-false}"

echo "══════════════════════════════════════"
echo " PROOF OF PANIC — SP1 Proof Generation"
echo "══════════════════════════════════════"
echo ""

if [ ! -f "$SNAPSHOT" ]; then
    echo "❌ snapshot.json not found. Run the simulator first: ./scripts/4-simulate.sh"
    exit 1
fi

echo "Step 1: Generating SP1 Groth16 proof..."
cd "$ROOT_DIR/sp1-script"

PROVE_START=$(date +%s)
cargo run --release --bin prove -- \
    --snapshot "$SNAPSHOT" \
    --output "$OUTPUT_DIR" \
    --shock-bps "$SHOCK_BPS" \
    --cache \
    $( [ "$SHOCK_UP" = "true" ] && echo "--shock-up" )
PROVE_END=$(date +%s)
PROVE_TIME=$((PROVE_END - PROVE_START))

PROOF_SIZE=$(wc -c < "$OUTPUT_DIR/proof.bin" 2>/dev/null || echo "unknown")
echo "✓ Proof generated (${PROVE_TIME}s, ${PROOF_SIZE} bytes)"
echo "  → $OUTPUT_DIR/proof.bin"
echo ""

echo "══════════════════════════════════════"
echo " ✓ Proof generation complete!"
echo "══════════════════════════════════════"
