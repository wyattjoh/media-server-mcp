# Media Server MCP

A Model Context Protocol (MCP) server that provides AI assistants with tools to manage Radarr (movies), Sonarr (TV series) media servers, and access TMDB data through natural language interactions.

## Packages

This is a monorepo containing the following packages:

- **[@wyattjoh/media-server-mcp](packages/media-server-mcp/)** - The main MCP server
- **[@wyattjoh/radarr](packages/radarr/)** - Radarr API client library
- **[@wyattjoh/sonarr](packages/sonarr/)** - Sonarr API client library
- **[@wyattjoh/tmdb](packages/tmdb/)** - TMDB API client library

## Features

- **Radarr Integration**: Search, add, manage, and monitor movies
- **Sonarr Integration**: Search, add, manage, and monitor TV series
- **TMDB Integration**: Advanced movie/TV discovery, external ID lookup, and comprehensive metadata
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
        "TMDB_API_KEY": "your-tmdb-api-key"
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
        "https://raw.githubusercontent.com/wyattjoh/media-server-mcp/main/packages/media-server-mcp/src/index.ts"
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

### Minimal TMDB-only Setup

```json
{
  "mcpServers": {
    "media-server": {
      "command": "deno",
      "args": ["run", "--allow-all", "jsr:@wyattjoh/media-server-mcp"],
      "env": {
        "TMDB_API_KEY": "your-tmdb-api-key"
      }
    }
  }
}
```

2. **Find your API keys**:
   - **Radarr**: Settings → General → Security → API Key
   - **Sonarr**: Settings → General → Security → API Key
   - **TMDB**: Sign up at [TMDB](https://www.themoviedb.org/), go to Settings → API → Create API Key

   **Important**:
   - For TMDB, you'll need a free TMDB account and API key from their developer section.

3. **Start using** - Ask your AI assistant to manage your media library!

## Configuration

### Environment Variables

| Variable         | Description                        | Required  |
| ---------------- | ---------------------------------- | --------- |
| `RADARR_URL`     | Base URL of your Radarr instance   | Optional* |
| `RADARR_API_KEY` | API key for Radarr authentication  | Optional* |
| `SONARR_URL`     | Base URL of your Sonarr instance   | Optional* |
| `SONARR_API_KEY` | API key for Sonarr authentication  | Optional* |
| `TMDB_API_KEY`   | TMDB API key for movie/TV metadata | Optional* |

*_At least one service (Radarr, Sonarr, or TMDB) must be configured._

### Example URLs

- **Local Radarr**: `http://localhost:7878`
- **Local Sonarr**: `http://localhost:8989`
- **Remote with custom port**: `https://radarr.yourdomain.com:443`

## Available Tools

### Radarr Tools (when configured)

#### Movie Management

- `radarr_search_movie` - Search for movies in The Movie Database
- `radarr_add_movie` - Add a movie to your library
- `radarr_get_movies` - List all movies in your library (supports filtering by title, genres, year range, monitored status, file availability, quality profile, tags, minimum availability, and TMDB ID)
- `radarr_get_movie` - Get details of a specific movie
- `radarr_delete_movie` - Remove a movie from your library

#### Queue and Downloads

- `radarr_get_queue` - View current download queue
- `radarr_search_movie_releases` - Search for releases of a specific movie

#### System Management

- `radarr_get_configuration` - Get configuration including quality profiles, root folders, and tags
- `radarr_get_system_status` - Get system information
- `radarr_get_health` - Check system health
- `radarr_refresh_movie` - Refresh movie metadata

### Sonarr Tools (when configured)

#### Series Management

- `sonarr_search_series` - Search for TV series
- `sonarr_add_series` - Add a TV series to your library
- `sonarr_get_series` - List all series in your library (supports filtering by title, genres, year range, monitored status, network, series type, quality profile, tags, status, and TMDB ID)
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

- `sonarr_get_configuration` - Get configuration including quality profiles and root folders
- `sonarr_get_system_status` - Get system information
- `sonarr_get_health` - Check system health
- `sonarr_refresh_series` - Refresh series metadata

### TMDB Tools (when configured)

#### Search and Discovery

- `tmdb_search_movies` - Search for movies on TMDB by title
- `tmdb_search_tv` - Search for TV shows on TMDB by title
- `tmdb_search_multi` - Search for movies, TV shows, and people in a single request
- `tmdb_get_popular_movies` - Get popular movies
- `tmdb_discover_movies` - Discover movies based on various criteria (genre, year, rating, etc.)
- `tmdb_discover_tv` - Discover TV shows based on various criteria

#### Trending Content

- `tmdb_get_trending` - Get trending movies, TV shows, or people by time window (day/week)

#### Movie Lists

- `tmdb_get_now_playing_movies` - Get movies currently playing in theaters
- `tmdb_get_top_rated_movies` - Get top rated movies
- `tmdb_get_upcoming_movies` - Get upcoming movie releases

#### TV Show Lists

- `tmdb_get_popular_tv` - Get popular TV shows
- `tmdb_get_top_rated_tv` - Get top rated TV shows
- `tmdb_get_on_the_air_tv` - Get TV shows currently on the air
- `tmdb_get_airing_today_tv` - Get TV shows airing today

#### Content Details

- `tmdb_get_movie_details` - Get detailed information about a specific movie
- `tmdb_get_tv_details` - Get detailed information about a specific TV show

#### Recommendations and Similar Content

- `tmdb_get_movie_recommendations` - Get movie recommendations based on a specific movie
- `tmdb_get_tv_recommendations` - Get TV show recommendations based on a specific show
- `tmdb_get_similar_movies` - Get movies similar to a specific movie
- `tmdb_get_similar_tv` - Get TV shows similar to a specific show

#### People Discovery

- `tmdb_search_people` - Search for people (actors, directors, etc.)
- `tmdb_get_popular_people` - Get popular people in the entertainment industry
- `tmdb_get_person_details` - Get detailed information about a specific person
- `tmdb_get_person_movie_credits` - Get a person's movie credits
- `tmdb_get_person_tv_credits` - Get a person's TV show credits

#### Collections and Keywords

- `tmdb_search_collections` - Search for movie collections
- `tmdb_get_collection_details` - Get details about a specific movie collection
- `tmdb_search_keywords` - Search for keywords
- `tmdb_get_movies_by_keyword` - Get movies associated with a specific keyword

#### Certifications and Watch Providers

- `tmdb_get_certifications` - Get movie or TV certifications by country
- `tmdb_get_watch_providers` - Get watch provider information for a movie or TV show

#### External ID Integration

- `tmdb_find_by_external_id` - Find TMDB content by external ID (TVDB ID, etc.)

#### Configuration and Metadata

- `tmdb_get_genres` - Get list of available genres for movies or TV shows
- `tmdb_get_configuration` - Get TMDB API configuration including image base URLs
- `tmdb_get_countries` - Get list of countries used in TMDB
- `tmdb_get_languages` - Get list of languages used in TMDB

## Usage Examples

### Natural Language Requests

With this MCP server configured, you can ask your AI assistant:

- "Add the movie Inception to my Radarr library"
- "Show me what TV series are in my Sonarr queue"
- "What episodes of Breaking Bad are airing this week?"
- "Add The Office to my TV library and monitor all seasons"
- "Find movies on TMDB similar to The Dark Knight from 2020-2024"
- "Discover highly-rated sci-fi TV shows on TMDB"
- "Get the Radarr system status and health"

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

#### Discovering Movies on TMDB

```json
{
  "tool": "tmdb_discover_movies",
  "arguments": {
    "with_genres": "28,878",
    "vote_average_gte": 7.0,
    "primary_release_year": 2023,
    "sort_by": "popularity.desc"
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
│   └── tmdb.ts           # TMDB API client
├── tools/
│   ├── radarr-tools.ts   # Radarr MCP tools
│   ├── sonarr-tools.ts   # Sonarr MCP tools  
│   └── tmdb-tools.ts     # TMDB MCP tools
├── utils/
│   └── filters.ts        # Filtering and sorting utilities
└── types/
    ├── radarr.ts         # Radarr type definitions
    ├── sonarr.ts         # Sonarr type definitions
    ├── tmdb.ts           # TMDB type definitions
    ├── mcp.ts            # MCP-specific types
    ├── filters.ts        # Filter and sort type definitions
    └── validation.ts     # Validation utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE.md file for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Integrates with [Radarr](https://radarr.video/), [Sonarr](https://sonarr.tv/), and [TMDB](https://www.themoviedb.org/)
- Uses [The Movie Database API](https://developers.themoviedb.org/3) for comprehensive movie and TV metadata
- Uses the Deno runtime for modern JavaScript/TypeScript execution
