# Media Server MCP

A Model Context Protocol (MCP) server that provides AI assistants with tools to manage Radarr (movies), Sonarr (TV series) media servers, and access IMDB data through natural language interactions.

## Features

- **Radarr Integration**: Search, add, manage, and monitor movies
- **Sonarr Integration**: Search, add, manage, and monitor TV series
- **IMDB Integration**: Search movies/shows, get details, cast info, and popular content
- **Flexible Configuration**: Each service is optional - configure any combination
- **Type-Safe**: Built with TypeScript for reliable operations
- **Easy Setup**: Install directly from JSR with a single deno run command

## Installation

### JSR (Recommended)

Add to your MCP servers configuration using the JSR package:

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
        "IMDB_URL": "https://imdb236.p.rapidapi.com/api/imdb",
        "RAPIDAPI_KEY": "your-rapidapi-key"
      }
    }
  }
}
```

### Direct from GitHub

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "https://raw.githubusercontent.com/wyattjoh/media-server-mcp/main/src/index.ts"
      ],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "your-radarr-api-key"
      }
    }
  }
}
```

## Quick Start

1. **Configure at least one service** in your MCP client's configuration:

### Minimal Radarr-only Setup

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp"],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "your-radarr-api-key"
      }
    }
  }
}
```

### Minimal Sonarr-only Setup

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp"],
      "env": {
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "your-sonarr-api-key"
      }
    }
  }
}
```

### Minimal IMDB-only Setup

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp"],
      "env": {
        "IMDB_URL": "https://imdb236.p.rapidapi.com/api/imdb",
        "RAPIDAPI_KEY": "your-rapidapi-key"
      }
    }
  }
}
```

2. **Find your API keys**:
   - **Radarr**: Settings → General → Security → API Key
   - **Sonarr**: Settings → General → Security → API Key
   - **IMDB**: Sign up at [RapidAPI](https://rapidapi.com/), subscribe to an IMDB API service

3. **Start using** - Ask your AI assistant to manage your media library!

## Configuration

### Environment Variables

| Variable         | Description                         | Required  |
| ---------------- | ----------------------------------- | --------- |
| `RADARR_URL`     | Base URL of your Radarr instance    | Optional* |
| `RADARR_API_KEY` | API key for Radarr authentication   | Optional* |
| `SONARR_URL`     | Base URL of your Sonarr instance    | Optional* |
| `SONARR_API_KEY` | API key for Sonarr authentication   | Optional* |
| `IMDB_URL`       | Base URL of IMDB API service        | Optional* |
| `RAPIDAPI_KEY`   | RapidAPI key for IMDB functionality | Optional* |

*_At least one service (Radarr, Sonarr, or IMDB) must be configured._

### Example URLs

- **Local Radarr**: `http://localhost:7878`
- **Local Sonarr**: `http://localhost:8989`
- **Remote with custom port**: `https://radarr.yourdomain.com:443`
- **IMDB via RapidAPI**: `https://imdb236.p.rapidapi.com/api/imdb`

## Available Tools

### Radarr Tools (when configured)

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

### Sonarr Tools (when configured)

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

### IMDB Tools (when configured)

#### Search and Discovery

- `imdb_search` - Search for movies and TV shows on IMDB
- `imdb_get_top_movies` - Get IMDB Top 250 movies
- `imdb_get_popular_movies` - Get currently popular movies
- `imdb_get_popular_tv_shows` - Get currently popular TV shows

#### Detailed Information

- `imdb_get_details` - Get detailed information about a movie or TV show
- `imdb_get_cast` - Get cast and crew information for a movie or TV show

## Usage Examples

### Natural Language Requests

With this MCP server configured, you can ask your AI assistant:

- "Add the movie Inception to my Radarr library"
- "Show me what TV series are in my Sonarr queue"
- "Search IMDB for popular action movies from 2023"
- "What episodes of Breaking Bad are airing this week?"
- "Add The Office to my TV library and monitor all seasons"

### API Examples

#### Adding a Movie

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

#### Adding a TV Series

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

#### Searching IMDB

```json
{
  "tool": "imdb_search",
  "arguments": {
    "query": "The Dark Knight"
  }
}
```

## Troubleshooting

### Common Issues

#### No Tools Available

- Ensure at least one service is configured with valid environment variables
- Check that URLs are accessible and API keys are correct
- Verify the MCP server is starting without errors

#### Connection Refused

- Verify Radarr/Sonarr URLs are correct and accessible
- Check that the services are running
- Ensure no firewall is blocking the connections

#### Unauthorized/403 Errors

- Verify API keys are correct and haven't expired
- Check that API access is enabled in service settings
- For IMDB, ensure RapidAPI subscription is active

### Debug Mode

Check MCP server logs for connection status on startup. The server will test each configured service and report connection results.

## Development

### Local Development Setup

1. Clone this repository:

```bash
git clone https://github.com/wyattjoh/media-server-mcp.git
cd media-server-mcp
```

2. Create environment configuration:

```bash
cp .env.example .env
# Edit .env with your service URLs and API keys
```

3. Run the server:

```bash
deno task dev
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

### Project Structure

```
src/
├── index.ts              # Main MCP server
├── clients/
│   ├── radarr.ts         # Radarr API client
│   ├── sonarr.ts         # Sonarr API client
│   └── imdb.ts           # IMDB API client
├── tools/
│   ├── radarr-tools.ts   # Radarr MCP tools
│   ├── sonarr-tools.ts   # Sonarr MCP tools  
│   └── imdb-tools.ts     # IMDB MCP tools
└── types/
    ├── radarr.ts         # Radarr type definitions
    ├── sonarr.ts         # Sonarr type definitions
    ├── imdb.ts           # IMDB type definitions
    └── mcp.ts            # MCP-specific types
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
- Integrates with [Radarr](https://radarr.video/), [Sonarr](https://sonarr.tv/), and [IMDB](https://www.imdb.com/)
- Uses [RapidAPI](https://rapidapi.com/) for IMDB data access
- Uses the Deno runtime for modern JavaScript/TypeScript execution
