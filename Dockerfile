# ==============================================================================
# BharatDrishti Production Dockerfile (Vite Frontend + Express Backend)
# Optimized for Render Web Service deployment
# ==============================================================================

FROM node:22-slim

# Install system dependencies (curl for container health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm matching project version
RUN npm install -g pnpm@10

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (required for building frontend and bundled server)
RUN pnpm install --frozen-lockfile || pnpm install

# Copy application source files
COPY . .

# Build Vite client assets into dist/public and bundle Express server into dist/index.js
RUN pnpm run build

# Configure runtime environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

EXPOSE 10000

# Health check against dedicated Express endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-10000}/health || exit 1

# Start the Express server
CMD ["node", "dist/index.js"]
