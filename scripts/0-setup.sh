#!/bin/bash
set -e

# ═══════════════════════════════════════════════
# PROOF OF PANIC — Setup Script
# ═══════════════════════════════════════════════
# Installs dependencies and builds all components.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "══════════════════════════════════════"
echo " PROOF OF PANIC — Setup"
echo "══════════════════════════════════════"
echo ""

# Check required tools
echo "Checking required tools..."
command -v anchor >/dev/null 2>&1 || { echo "❌ anchor not found. Install: https://www.anchor-lang.com/docs/installation"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "❌ solana not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "❌ cargo not found. Install: https://www.rust-lang.org/tools/install"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node not found. Install: https://nodejs.org/"; exit 1; }
echo "✓ All required tools found"
echo ""

# Optional ZK tools
if command -v cargo-prove >/dev/null 2>&1; then
    echo "✓ SP1 found: $(cargo prove --version)"
else
    echo "⚠ SP1 not found — install via: curl -L https://sp1.succinct.xyz | bash"
fi

if command -v sunspot >/dev/null 2>&1; then
    echo "✓ sunspot found"
else
    echo "⚠ sunspot not found — clone & build from: https://github.com/reilabs/sunspot"
fi
echo ""

# Build Anchor program
echo "Building Anchor program..."
cd "$ROOT_DIR"
anchor build
echo "✓ Anchor program built"
echo ""

# Build simulator
echo "Building simulator..."
cargo build -p panic-simulator --release
echo "✓ Simulator built"
echo ""

# Install script dependencies
echo "Installing script dependencies..."
cd "$SCRIPT_DIR"
npm install
echo "✓ Script dependencies installed"
echo ""

echo "══════════════════════════════════════"
echo " ✓ Setup complete!"
echo "══════════════════════════════════════"
