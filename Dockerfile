FROM rust:1.81-slim-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    curl \
    git \
    nodejs \
    npm

WORKDIR /app

# Copy the rust files
COPY Cargo.toml Cargo.lock ./
COPY simulator ./simulator
COPY sp1-script ./sp1-script
COPY sp1-program ./sp1-program

# Build simulator and sp1-script
RUN cargo build --release -p panic-simulator
RUN cargo build --release --manifest-path sp1-script/Cargo.toml --bin prove

# Base image for runtime
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Copy package info
COPY package.json package-lock.json tsconfig.json ./
COPY scripts ./scripts
COPY packages ./packages

# Install Node modules
RUN npm install

# Copy binaries from builder
COPY --from=builder /app/target/release/panic-simulator /usr/local/bin/panic-simulator
COPY --from=builder /app/sp1-script/target/release/prove /usr/local/bin/panic-sp1-prove

# Set environment
ENV SP1_PROVER=mock
ENV RPC_URL=http://127.0.0.1:8899

# Run the keeper loop script
# (Assumes scripts/keeper.ts exists, or use demo.sh for demo purposes)
CMD ["npx", "ts-node", "scripts/keeper.ts"]
