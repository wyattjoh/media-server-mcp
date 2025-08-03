# Media Server MCP

A Model Context Protocol (MCP) server that provides tools for interacting with Radarr and Sonarr APIs. This allows AI assistants to manage your media library through natural language interactions.

## Features

- **Radarr Integration**: Search, add, manage, and monitor movies
- **Sonarr Integration**: Search, add, manage, and monitor TV series
- **Comprehensive API Coverage**: Access to most Radarr and Sonarr v3 API endpoints
- **Type-Safe**: Built with TypeScript for reliable operations
- **Flexible Configuration**: Support for either or both services

## Installation

### Prerequisites

- [Deno](https://deno.land/) runtime
- Running Radarr and/or Sonarr instances
- API keys for your media servers

### Setup

1. Clone this repository:

```bash
git clone <repository-url>
cd media-server-mcp
```

2. Create environment configuration:

```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:

```bash
RADARR_URL=http://localhost:7878
RADARR_API_KEY=your-radarr-api-key
SONARR_URL=http://localhost:8989
SONARR_API_KEY=your-sonarr-api-key
```

4. Run the server:

```bash
deno run --allow-all src/index.ts
```

## Configuration

### Environment Variables

| Variable         | Description                       | Required  |
| ---------------- | --------------------------------- | --------- |
| `RADARR_URL`     | Base URL of your Radarr instance  | Optional* |
| `RADARR_API_KEY` | API key for Radarr authentication | Optional* |
| `SONARR_URL`     | Base URL of your Sonarr instance  | Optional* |
| `SONARR_API_KEY` | API key for Sonarr authentication | Optional* |

*At least one service (Radarr or Sonarr) must be configured.

### Finding API Keys

#### Radarr

1. Open Radarr web interface
2. Go to Settings → General
3. Find "API Key" in the Security section

#### Sonarr

1. Open Sonarr web interface
2. Go to Settings → General
3. Find "API Key" in the Security section

## Available Tools

### Radarr Tools

#### Movie Management

- `radarr_search_movie` - Search for movies in The Movie Database
- `radarr_add_movie` - Add a movie to your library
- `radarr_get_movies` - List all movies in your library
- `radarr_get_movie` - Get details of a specific movie
- `radarr_delete_movie` - Remove a movie from your library

#### Queue and Downloads

- `radarr_get_queue` - View current download queue
- `radarr_search_movie_releases` - Search for releases of a specific movie

#### System Management

- `radarr_get_quality_profiles` - List available quality profiles
- `radarr_get_root_folders` - List configured root folders
- `radarr_get_system_status` - Get system information
- `radarr_get_health` - Check system health
- `radarr_refresh_movie` - Refresh movie metadata

### Sonarr Tools

#### Series Management

- `sonarr_search_series` - Search for TV series
- `sonarr_add_series` - Add a TV series to your library
- `sonarr_get_series` - List all series in your library
- `sonarr_get_series_by_id` - Get details of a specific series
- `sonarr_delete_series` - Remove a series from your library

#### Episode Management

- `sonarr_get_episodes` - Get episodes for a series
- `sonarr_update_episode_monitoring` - Change episode monitoring status
- `sonarr_get_calendar` - View upcoming episodes
- `sonarr_search_series_episodes` - Search for all episodes of a series
- `sonarr_search_season` - Search for episodes of a specific season

#### Queue and Downloads

- `sonarr_get_queue` - View current download queue

#### System Management

- `sonarr_get_quality_profiles` - List available quality profiles
- `sonarr_get_root_folders` - List configured root folders
- `sonarr_get_system_status` - Get system information
- `sonarr_get_health` - Check system health
- `sonarr_refresh_series` - Refresh series metadata

## Usage Examples

### Adding a Movie

```json
{
  "tool": "radarr_add_movie",
  "arguments": {
    "tmdbId": 550,
    "title": "Fight Club",
    "year": 1999,
    "qualityProfileId": 1,
    "rootFolderPath": "/movies",
    "minimumAvailability": "released",
    "monitored": true,
    "searchForMovie": true
  }
}
```

### Adding a TV Series

```json
{
  "tool": "sonarr_add_series",
  "arguments": {
    "tvdbId": 78804,
    "title": "Breaking Bad",
    "qualityProfileId": 1,
    "rootFolderPath": "/tv",
    "monitored": true,
    "seasonFolder": true,
    "seriesType": "standard"
  }
}
```

### Searching for Content

```json
{
  "tool": "radarr_search_movie",
  "arguments": {
    "term": "Inception"
  }
}
```

## Development

### Project Structure

```
src/
├── index.ts              # Main MCP server
├── clients/
│   ├── radarr.ts         # Radarr API client
│   └── sonarr.ts         # Sonarr API client
├── tools/
│   ├── radarr-tools.ts   # Radarr MCP tools
│   └── sonarr-tools.ts   # Sonarr MCP tools
└── types/
    ├── radarr.ts         # Radarr type definitions
    ├── sonarr.ts         # Sonarr type definitions
    └── mcp.ts            # MCP-specific types
```

### Available Scripts

```bash
# Development with hot reload
deno task dev

# Production run
deno task start

# Type checking
deno task check

# Code formatting
deno task fmt

# Linting
deno task lint
```

### Testing Connections

The server will test connections to configured services on startup and log the results. Check the console output for connection status.

## Troubleshooting

### Common Issues

#### Connection Refused

- Verify Radarr/Sonarr URLs are correct and accessible
- Check that the services are running
- Ensure no firewall blocking the connections

#### Unauthorized/403 Errors

- Verify API keys are correct
- Check that API keys haven't expired
- Ensure API access is enabled in service settings

#### Tools Not Available

- Check environment variables are properly set
- Ensure at least one service is configured
- Verify the service is responding to API calls

### Debug Mode

For detailed logging, you can modify the server to include debug output:

```bash
# Add debug environment variable
DEBUG=1 deno run --allow-all src/index.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Integrates with [Radarr](https://radarr.video/) and [Sonarr](https://sonarr.tv/)
- Uses the Deno runtime for modern JavaScript/TypeScript execution
