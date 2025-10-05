# Multi-stage build for media-server-mcp
FROM denoland/deno:alpine AS builder

# Install build dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Cache dependencies
RUN deno cache --unstable packages/media-server-mcp/src/index.ts

# Production stage
FROM denoland/deno:alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl

# Use existing deno user (already created in base image)

# Set working directory
WORKDIR /app

# Copy cached dependencies and source from builder
COPY --from=builder --chown=deno:deno /app/deno.json /app/deno.lock ./
COPY --from=builder --chown=deno:deno /app/packages ./packages

# Create directories for logs and config
RUN mkdir -p /app/logs /app/config && \
    chown -R deno:deno /app/logs /app/config

# Switch to non-root user
USER deno

# Expose port for SSE mode
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command (STDIO mode)
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "--allow-write=/app/logs,/app/config", "packages/media-server-mcp/src/index.ts"]

