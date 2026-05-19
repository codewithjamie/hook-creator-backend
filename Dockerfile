# ─────────────────────────────────────────────────────────────────────────────
#  OpenEdge NestJS — Production Dockerfile
#  Optimised multi-stage build for Railway / Render / ECS
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (layer caching)
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all deps (including devDeps for build)
RUN npm ci

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime

LABEL org.opencontainers.image.title="OpenEdge NestJS API"
LABEL org.opencontainers.image.description="Video analysis backend with FFmpeg crossfade"

WORKDIR /app

# ── System dependencies ───────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # FFmpeg for video processing
    ffmpeg \
    # Python for yt-dlp
    python3 \
    python3-pip \
    # curl for health checks and yt-dlp updates
    curl \
    # Required for some ffmpeg operations
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# ── Install yt-dlp (latest stable) ───────────────────────────────────────────
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Verify installations
RUN ffmpeg -version | head -1 \
    && yt-dlp --version

# ── App files ─────────────────────────────────────────────────────────────────
# Copy built app and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# ── Runtime config ────────────────────────────────────────────────────────────
# Create upload temp directory
RUN mkdir -p /tmp/openedge-uploads && chmod 777 /tmp/openedge-uploads

# Non-root user for security
RUN groupadd -r openedge && useradd -r -g openedge openedge
RUN chown -R openedge:openedge /app /tmp/openedge-uploads
USER openedge

# Expose port
EXPOSE 3000

# Health check for Railway / ECS
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Environment defaults (override at deploy time)
ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/tmp/openedge-uploads

# Start
CMD ["node", "dist/main"]
