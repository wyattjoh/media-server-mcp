# @wyattjoh/media-server-mcp

The main Model Context Protocol (MCP) server that provides AI assistants with tools to manage Radarr, Sonarr, and access TMDB data.

## Installation

### JSR (Recommended)

Add to your MCP servers configuration:

#### Stdio Mode (Default)

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp"],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "your-radarr-api-key",
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "your-sonarr-api-key",
        "TMDB_API_KEY": "your-tmdb-api-key"
      }
    }
  }
}
```

#### SSE Mode (HTTP Server-Sent Events)

For HTTP-based MCP connections using Server-Sent Events. **Note: SSE mode requires authentication for security.**

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp", "--sse"],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "your-radarr-api-key",
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "your-sonarr-api-key",
        "TMDB_API_KEY": "your-tmdb-api-key",
        "MCP_AUTH_TOKEN": "your-secure-auth-token"
      }
    }
  }
}
```

Or specify a custom port:

```bash
deno run --allow-all jsr:@wyattjoh/media-server-mcp --sse --port 4000
```

## Command Line Options

The server supports the following command line options:

- `--sse` - Run server in SSE (Server-Sent Events) mode over HTTP instead of stdio
- `-p, --port <port>` - Port to run SSE server on (default: 3000)
- `--help` - Show help information
- `--version` - Show version information

### Examples

```bash
# Run in stdio mode (default)
deno run --allow-all jsr:@wyattjoh/media-server-mcp

# Run in SSE mode on default port (3000)
deno run --allow-all jsr:@wyattjoh/media-server-mcp --sse

# Run in SSE mode on custom port
deno run --allow-all jsr:@wyattjoh/media-server-mcp --sse --port 8080
```

## SSE Mode Endpoints

When running in SSE mode, the following HTTP endpoints are available:

- `GET /sse?sessionId=<uuid>` - Server-Sent Events stream for MCP communication
- `POST /messages?sessionId=<uuid>` - Client-to-server message endpoint
- `GET /health` - Health check endpoint

### SSE Mode Authentication

SSE mode requires Bearer token authentication for security. All HTTP endpoints except `/health` require a valid Authorization header:

```bash
Authorization: Bearer your-secure-auth-token
```

**Authentication Requirements:**

- Set the `MCP_AUTH_TOKEN` environment variable when running in SSE mode
- Include the Bearer token in all HTTP requests to `/sse` and `/messages` endpoints
- The `/health` endpoint remains unauthenticated for monitoring purposes
- Missing or invalid tokens result in 401 Unauthorized responses

**Example authenticated request:**

```bash
# Connect to SSE endpoint with authentication
curl -H "Authorization: Bearer your-secure-auth-token" \
     "http://localhost:3000/sse?sessionId=abc123"
```

### SSE Mode Usage Notes

- **HTTP Implementation**: SSE mode uses Node.js's built-in `http` module for maximum compatibility with the MCP SDK's SSE transport
- **Deprecated Transport**: SSE mode uses the MCP SDK's SSE transport, which is deprecated in favor of Streamable HTTP in newer MCP versions
- **Session Management**: Each client connection requires a unique session ID (UUID)
- **CORS Support**: The server includes CORS headers for browser-based clients, including Authorization header support
- **Connection Testing**: Use the `/health` endpoint to verify server status and active sessions

## Environment Variables

The following environment variables can be configured:

### Service Configuration (at least one required)

- `RADARR_URL` - Radarr server URL (e.g., `http://localhost:7878`)
- `RADARR_API_KEY` - Radarr API key (found in Settings → General → Security)
- `SONARR_URL` - Sonarr server URL (e.g., `http://localhost:8989`)
- `SONARR_API_KEY` - Sonarr API key (found in Settings → General → Security)
- `TMDB_API_KEY` - TMDB API key (get free account at [TMDB](https://www.themoviedb.org/))

### Security Configuration

- `MCP_AUTH_TOKEN` - **Required for SSE mode only** - Bearer token for HTTP authentication. Generate a secure random string for this value.

### Example Environment Setup

```bash
# Service URLs and API keys
export RADARR_URL="http://localhost:7878"
export RADARR_API_KEY="your-radarr-api-key"
export SONARR_URL="http://localhost:8989" 
export SONARR_API_KEY="your-sonarr-api-key"
export TMDB_API_KEY="your-tmdb-api-key"

# Authentication token (SSE mode only)
export MCP_AUTH_TOKEN="$(openssl rand -base64 32)"

# Run in SSE mode
deno run --allow-all jsr:@wyattjoh/media-server-mcp --sse
```

## Dependencies

This package uses the following client libraries:

- [@wyattjoh/radarr](../radarr/) - Radarr API client
- [@wyattjoh/sonarr](../sonarr/) - Sonarr API client
- [@wyattjoh/tmdb](../tmdb/) - TMDB API client

## Development

```bash
# Run development server (stdio mode)
deno task dev

# Run development server (SSE mode)
deno task dev:sse

# Run production server (stdio mode)
deno task start

# Run production server (SSE mode)
deno task start:sse

# Run tests
deno test --allow-net

# Type check
deno check

# Lint
deno lint

# Format code
deno fmt
```

## License

MIT
