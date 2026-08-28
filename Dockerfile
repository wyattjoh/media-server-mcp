# syntax=docker/dockerfile:1.7

# Keep this exact version aligned with .tool-versions and CI.
FROM denoland/deno:alpine-2.9.5 AS base

WORKDIR /app

# Copy only the files needed to resolve and cache dependencies first so
# subsequent source-only changes don't bust the dependency cache layer.
COPY deno.json deno.lock ./
COPY packages/plex/deno.json ./packages/plex/deno.json
COPY packages/radarr/deno.json ./packages/radarr/deno.json
COPY packages/sonarr/deno.json ./packages/sonarr/deno.json
COPY packages/tmdb/deno.json ./packages/tmdb/deno.json
COPY packages/media-server-mcp/deno.json ./packages/media-server-mcp/deno.json

# The trusted runner is a fixed source sidecar. Copy all workspace sources, then
# cache both the server and the runner static graphs for frozen offline starts.
COPY packages/ ./packages/
RUN deno cache --frozen \
  packages/media-server-mcp/src/index.ts \
  packages/media-server-mcp/src/tools/codemode-runner.ts

FROM base AS test
RUN deno test --allow-run=deno --allow-net --allow-env \
  packages/media-server-mcp/tests/tools/codemode-executor_test.ts \
  packages/media-server-mcp/tests/tools/codemode-tools_test.ts

FROM base AS production

EXPOSE 3000

# Streamable HTTP transport, bound to all interfaces inside the container.
# Reverse-proxy / Tailscale serve sidecar is expected to terminate TLS.
ENTRYPOINT ["deno", "run", \
  "--cached-only", "--frozen", \
  "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-net", \
  "packages/media-server-mcp/src/index.ts"]
CMD ["--http", "--host", "0.0.0.0", "--port", "3000"]
