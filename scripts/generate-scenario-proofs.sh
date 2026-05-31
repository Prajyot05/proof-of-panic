#!/bin/bash
# Proof of Panic - Scenario Proof Generator
# This script iterates through all scenarios and runs the sp1-script to generate on-chain proof artifacts.
# NOTE: Generating SP1 proofs locally without a GPU can take 10-20 minutes per proof.
# Consider setting SP1_PROVER=network and SP1_PRIVATE_KEY to offload to Succinct's Prover Network.

set -e

echo "Building SP1 script..."
cargo build -p sp1-script --release

SCENARIOS_DIR="app/public/scenarios"

for scenario in "$SCENARIOS_DIR"/*; do
  if [ -d "$scenario" ]; then
    SCENARIO_ID=$(basename "$scenario")
    echo "========================================"
    echo "Processing $SCENARIO_ID..."
    
    if [ -f "$scenario/snapshot.json" ]; then
      SHOCK_BPS=2000
      SHOCK_UP_FLAG=""
      
      # Determine arguments
      if [ "$SCENARIO_ID" = "short-squeeze" ]; then
         SHOCK_UP_FLAG="--shock-up"
      fi
      
      if grep -q "shock_up = true" "$scenario/Prover.toml" 2>/dev/null; then
          SHOCK_UP_FLAG="--shock-up"
      fi
      if grep -q "shock_bps" "$scenario/Prover.toml" 2>/dev/null; then
          SHOCK_BPS=$(grep "shock_bps" "$scenario/Prover.toml" | cut -d '=' -f 2 | tr -d ' ' || echo "2000")
      fi
      
      echo "Running SP1 prover with shock_bps=$SHOCK_BPS $SHOCK_UP_FLAG"
      
      if [ -n "$SHOCK_UP_FLAG" ]; then
        ./target/release/panic-sp1-script \
          --snapshot "$scenario/snapshot.json" \
          --shock-bps "$SHOCK_BPS" \
          --shock-up \
          --output "$scenario"
      else
        ./target/release/panic-sp1-script \
          --snapshot "$scenario/snapshot.json" \
          --shock-bps "$SHOCK_BPS" \
          --output "$scenario"
      fi
        
      echo "✅ Generated proofs for $SCENARIO_ID"
    fi
  fi
done

echo "🎉 All scenario proofs generated successfully!"
