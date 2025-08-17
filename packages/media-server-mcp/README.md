# @wyattjoh/media-server-mcp

The main Model Context Protocol (MCP) server that provides AI assistants with tools to manage Radarr, Sonarr, and access TMDB data.

## Installation

### JSR (Recommended)

Add to your MCP servers configuration:

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

## Dependencies

This package uses the following client libraries:

- [@wyattjoh/radarr](../radarr/) - Radarr API client
- [@wyattjoh/sonarr](../sonarr/) - Sonarr API client
- [@wyattjoh/tmdb](../tmdb/) - TMDB API client

## Development

```bash
# Run development server
deno task dev

# Run tests
deno test --allow-net

# Type check
deno task check

# Lint
deno task lint
```

## License

MIT
