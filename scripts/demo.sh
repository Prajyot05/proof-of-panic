#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Full Demo
# ═══════════════════════════════════════════════
# Runs the complete end-to-end demo in sequence.
# 
# Usage: ./scripts/demo.sh
#
# This script assumes:
# - solana-test-validator is running (or will be started)
# - All dependencies are installed (run 0-setup.sh first)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║          PROOF OF PANIC                      ║"
echo "║   ZK-Verified Adversarial Risk Engine        ║"
echo "║          for Solana Perpetuals               ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 0: Check validator ──
echo "━━━ Step 0: Checking local validator ━━━"
if solana cluster-version 2>/dev/null | grep -q .; then
    echo "✓ Local validator is running"
else
    echo "Starting local validator..."
    solana-test-validator --reset --quiet &
    VALIDATOR_PID=$!
    sleep 3
    echo "✓ Local validator started (PID: $VALIDATOR_PID)"
fi
echo ""
sleep 1

# ── Step 1: Deploy program ──
echo "━━━ Step 1: Deploying Anchor program ━━━"
cd "$ROOT_DIR"
anchor deploy 2>&1 | tail -5
echo "✓ Program deployed"
echo ""
sleep 1

# ── Step 2: Initialize protocol ──
echo "━━━ Step 2: Initializing protocol ━━━"
cd "$SCRIPT_DIR"
npx ts-node 2-initialize.ts
echo ""
sleep 1

# ── Step 3: Snapshot state ──
echo "━━━ Step 3: Taking state snapshot ━━━"
npx ts-node 3-snapshot.ts
echo ""
sleep 1

# ── Step 4: Run simulation ──
echo "━━━ Step 4: Running adversarial simulation ━━━"
bash "$SCRIPT_DIR/4-simulate.sh"
sleep 1

# ── Step 5: Generate proof ──
echo "━━━ Step 5: Generating ZK proof ━━━"
bash "$SCRIPT_DIR/5-prove.sh"
sleep 1

# ── Step 6: Verify on-chain ──
echo "━━━ Step 6: Verifying proof on-chain ━━━"
npx ts-node 6-verify.ts
echo ""
sleep 1

# ── Step 7: Final state ──
echo "━━━ Step 7: Final protocol state ━━━"
npx ts-node 7-status.ts
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║     ✓ PROOF OF PANIC — Demo Complete         ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
