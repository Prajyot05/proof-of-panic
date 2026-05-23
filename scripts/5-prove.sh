#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Generate ZK Proof
# ═══════════════════════════════════════════════
# Runs the full Noir + Sunspot pipeline to produce a Groth16 proof.
#
# Prerequisites:
#   - nargo (installed via noirup)
#   - sunspot (built from https://github.com/reilabs/sunspot)
#   - Prover.toml must exist (produced by the simulator)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/panic_proof"

export PATH="$HOME/.nargo/bin:$PATH"

echo "══════════════════════════════════════"
echo " PROOF OF PANIC — ZK Proof Generation"
echo "══════════════════════════════════════"
echo ""

cd "$CIRCUIT_DIR"

# Check Prover.toml exists
if [ ! -f "Prover.toml" ]; then
    echo "❌ Prover.toml not found. Run the simulator first: ./scripts/4-simulate.sh"
    exit 1
fi

# Step 1: Compile circuit
echo "Step 1: Compiling Noir circuit..."
nargo compile
echo "✓ Circuit compiled"
echo ""

# Step 2: Execute witness
echo "Step 2: Generating witness..."
nargo execute
echo "✓ Witness generated"
echo ""

# Check if sunspot is available
if ! command -v sunspot >/dev/null 2>&1; then
    echo "⚠ sunspot not found — skipping Groth16 proof generation"
    echo "  To install: clone & build https://github.com/reilabs/sunspot"
    echo "  The circuit compiled and witness was generated successfully."
    exit 0
fi

# Step 3: Convert to constraint system
echo "Step 3: Converting to constraint system..."
sunspot compile target/panic_proof.json
echo "✓ Constraint system generated"
echo ""

# Step 4: Trusted setup (skip if keys exist)
if [ ! -f "target/panic_proof.pk" ] || [ ! -f "target/panic_proof.vk" ]; then
    echo "Step 4: Running trusted setup..."
    sunspot setup target/panic_proof.ccs
    echo "✓ Proving key and verifying key generated"
else
    echo "Step 4: Trusted setup cached ✓"
fi
echo ""

# Step 5: Generate proof
echo "Step 5: Generating Groth16 proof..."
PROVE_START=$(date +%s)
sunspot prove
PROVE_END=$(date +%s)
PROVE_TIME=$((PROVE_END - PROVE_START))

PROOF_SIZE=$(wc -c < target/panic_proof.proof 2>/dev/null || echo "unknown")
echo "✓ Proof generated (${PROVE_TIME}s, ${PROOF_SIZE} bytes)"
echo "  → target/panic_proof.proof"
echo ""

echo "══════════════════════════════════════"
echo " ✓ Proof generation complete!"
echo "══════════════════════════════════════"
