#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Generate All Adversarial Scenarios
# ═══════════════════════════════════════════════
# Runs the simulator against all 5 built-in scenarios
# and writes output to app/public/scenarios/<name>/
#
# Usage: ./scripts/generate-scenarios.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCENARIOS_DIR="$ROOT_DIR/app/public/scenarios"

echo "══════════════════════════════════════"
echo " PROOF OF PANIC — Scenario Generator"
echo "══════════════════════════════════════"
echo ""

# Build simulator
echo "Building simulator..."
cargo build -p panic-simulator --release 2>&1 | tail -1
echo "✓ Simulator built"
echo ""

# Scenario definitions
SCENARIOS=("volatility-shock" "mild-correction" "flash-crash" "short-squeeze" "cascading-leverage")

for scenario in "${SCENARIOS[@]}"; do
    echo "━━━ Generating: $scenario ━━━"
    OUT_DIR="$SCENARIOS_DIR/$scenario"
    mkdir -p "$OUT_DIR"

    EXTRA_FLAGS=""
    if [ "$scenario" = "short-squeeze" ]; then
        EXTRA_FLAGS="--shock-up"
    fi

    cargo run --release -p panic-simulator -- \
        --scenario "$scenario" \
        --output "$OUT_DIR" \
        $EXTRA_FLAGS 2>&1 | grep -E "(Scenario|⚡|Liquidations|Bad Debt|Risk Score|✓)"

    echo ""
done

echo "══════════════════════════════════════"
echo " ✓ All 5 scenarios generated!"
echo "══════════════════════════════════════"
echo ""
echo "Output: $SCENARIOS_DIR/"
ls -la "$SCENARIOS_DIR"/*/results.json 2>/dev/null || echo "  (check output directories)"
