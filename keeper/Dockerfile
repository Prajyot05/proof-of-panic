# Base image
FROM node:20-alpine

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/sdk/package*.json ./packages/sdk/
COPY keeper/package*.json ./keeper/

# Install dependencies (workspaces)
RUN npm ci

# Copy source code
COPY packages/sdk/ ./packages/sdk/
COPY keeper/ ./keeper/

# Build SDK and Keeper
RUN cd packages/sdk && npm run build
RUN cd keeper && npm run build

# Start keeper
WORKDIR /app/keeper
EXPOSE 10000

CMD ["npm", "start"]
