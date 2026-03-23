# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Type checking - Always run before committing
deno check

# Linting - Always run before committing  
deno lint

# Code formatting
deno fmt

# Run tests
deno test --allow-net

# Development with hot reload
deno task dev

# Development with debug logging enabled
deno task dev --debug

# Production run
deno task start

# Production run with debug logging enabled  
deno task start --debug

# SSE mode with debug logging
deno task dev:sse --debug
deno task start:sse --debug

# Streamable HTTP mode (recommended for remote MCP)
deno task dev:http --debug
deno task start:http --debug

# Streamable HTTP mode with custom host/port
deno task start:http --port 8080 --host 127.0.0.1
```

## Monorepo Structure

This repository is organized as a Deno workspace with the following packages:

- **packages/radarr/** - `@wyattjoh/radarr` - Radarr API client library
- **packages/sonarr/** - `@wyattjoh/sonarr` - Sonarr API client library
- **packages/tmdb/** - `@wyattjoh/tmdb` - TMDB API client library
- **packages/plex/** - `@wyattjoh/plex` - Plex API client library
- **packages/media-server-mcp/** - `@wyattjoh/media-server-mcp` - Main MCP server

Each package is independently publishable and has its own `deno.json` configuration.

## Development Best Practices

- Always use `deno task fmt`, `deno task lint`, and `deno task check` after modifying or creating code to ensure that it's correct.
- Run `deno test --allow-net` to verify all tests pass before committing changes.
- Tests are organized by layer: `packages/media-server-mcp/tests/` contains `tools/` (tool tests), `server_test.ts`, `auth_test.ts`, and transport tests (`sse-transport_test.ts`, `streamable-http-transport_test.ts`). Each client package also has its own `tests/` directory.
- After changing any of the available MCP tools or resources, evaluate if you need to update the README.md and CLAUDE.md to be reflective of those changes.
- When creating pull requests, always use the PR template at `.github/pull_request_template.md`.

### File Naming Conventions

- **Source files**: Use kebab-case for all source files (e.g., `query-enhancer.ts`, `search-service.ts`)
- **Test files**: Use kebab-case with `_test.ts` suffix (e.g., `query-enhancer_test.ts`, `search-service_test.ts`)
- **Directory structure**: Tests mirror the source structure in the `packages/media-server-mcp/tests/` directory

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides AI assistants with tools to manage Radarr (movies), Sonarr (TV series), and Plex media servers, and access TMDB data through their APIs.

### Core Architecture Pattern

The codebase follows a **layered architecture**:

1. **MCP Server Layer** (`packages/media-server-mcp/src/index.ts`): Main server that handles MCP protocol communication
2. **Tool Layer** (`packages/media-server-mcp/src/tools/`): MCP tool definitions and handlers that bridge MCP and API clients
3. **Client Packages** (`packages/{radarr,sonarr,tmdb,plex}/`): Standalone client libraries for each service
4. **Type Definitions**: Each package contains its own TypeScript definitions
5. **Shared Components**: Client packages include filtering and validation utilities

### Key Architectural Decisions

**Direct Tool Registration**: Tools are registered directly on the `McpServer` instance via `createRadarrTools()`, `createSonarrTools()`, `createTMDBTools()`, and `createPlexTools()` functions. Each function accepts the server, service config, and a tool filter function, then registers tools as side effects using `server.registerTool()`. Tool handlers are closures that capture the service config at registration time.

**Tool Filtering System**: A configurable tool filtering system (`tool-categories.ts`, `tool-filter.ts`) allows enabling/disabling tools via profiles, branches, include/exclude lists, or config files. This controls which tools are registered on the server.

**Configuration Injection**: The main server maintains optional service configurations (`radarrConfig`, `sonarrConfig`, `tmdbConfig`, `plexConfig`) and passes them into tool registration functions, allowing the server to work with any combination of services configured.

**Environment-Based Configuration**: Service availability is determined by environment variables at startup. Missing configuration results in that service's tools being unavailable rather than failing the entire server.

### Type System

- **Strict TypeScript**: Uses `exactOptionalPropertyTypes: true` - optional properties must be explicitly `| undefined` rather than using `?:`
- **Zod Validation**: All tool parameters use Zod schemas for runtime validation
- **API Type Definitions**: Comprehensive interfaces for Radarr, Sonarr, TMDB, and Plex API responses in each package's `src/types.ts`

### Functional Architecture Pattern

This codebase **ALWAYS** follows a **functional architecture** approach rather than classes:

- **No Classes**: All code should be implemented using functions, not classes. This applies to clients, services, utilities, and all other modules.
- **Configuration Objects**: Each service uses config objects (`RadarrConfig`, `SonarrConfig`, `TMDBConfig`, `PlexConfig`) created by factory functions (`createRadarrConfig()`, `createSonarrConfig()`, `createTMDBConfig()`, `createPlexConfig()`)
- **HTTP Communication**: Each client has a private `makeRequest<T>()` function that handles all HTTP communication
- **Public Functions**: Individual functions (`getMovies()`, `addMovie()`, `searchMovies()`, etc.) are exported functions that accept config objects and call `makeRequest`
- **Async Patterns**: Functions that only call `makeRequest` without additional `await` should NOT be marked `async`
- **Connection Testing**: Each client exports a `testConnection()` function that returns `{ success: boolean; error?: string }`

**TMDB Client Specifics**: Uses direct TMDB API with `Authorization: Bearer {api_key}` header authentication and includes a pagination utility function `toPaginatedResponse()` for consistent result formatting.

**Plex Client Specifics**: Uses Plex API with `X-Plex-Token` header authentication for accessing media libraries, search functionality, and server capabilities.

### Plex API Notes (verified against Plex Media Server 1.43.x)

**Collection item management changed in Plex 1.28+.** The legacy `server://` URI approach (`PUT /library/collections/{id}/items?uri=server://{machineId}/...`) no longer works. It returns 400 Bad Request on modern Plex versions. Do not attempt to implement or restore it.

**Current working API for manual (non-smart) collections:**

| Operation                   | Endpoint                                                                                                                   | Method | Notes                                                                                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add item to collection      | `/library/metadata/{itemId}?collection[N].tag.tag={title}&collection.locked=1`                                             | PUT    | Tag the item with the collection name; Plex creates the collection automatically if it doesn't exist. `collection[N]` must use **literal bracket syntax** — do NOT use `URLSearchParams` for these keys as it encodes `[` → `%5B`. |
| Remove item from collection | `/library/collections/{collectionId}/items/{itemId}`                                                                       | DELETE | Returns updated collection metadata as JSON.                                                                                                                                                                                       |
| Create collection           | Tag initial items (above), then look up the resulting collection by title via `/library/sections/{sectionKey}/collections` | —      | No dedicated "create" endpoint needed; tagging auto-creates.                                                                                                                                                                       |

**Safe tag preservation**: When adding an item to a collection, always `GET /library/metadata/{itemId}` first to retrieve existing collection tags, then include all existing tags plus the new one in the PUT. This preserves memberships in other collections.

**`makeRequest` content handling**: Plex returns XML (not JSON) for metadata PUT responses. The `makeRequest` function discards non-JSON response bodies rather than attempting to parse them. Do not assume Plex always returns JSON.

**API reference resources:**

- [Plex Media Server URL Commands (unofficially documented)](https://support.plex.tv/articles/201638786-plex-media-server-url-commands/) — official Plex support article
- [python-plexapi source](https://github.com/pkkid/python-plexapi) — the most reliable reference for Plex API behaviour; check `collection.py` and `library.py` for endpoint patterns
- [Plex API (community wiki)](https://github.com/nicedoc/plex-api) — community-documented endpoints

### Error Handling Pattern

- Unknown errors must be handled with `error instanceof Error ? error.message : String(error)`
- Tool handlers catch all errors and return error results with `isError: true`
- Connection testing on startup logs warnings but doesn't prevent server launch

## Environment Variables

At least one service must be configured:

```bash
# Radarr Configuration (optional)
RADARR_URL=http://localhost:7878
RADARR_API_KEY=your-radarr-api-key

# Sonarr Configuration (optional)
SONARR_URL=http://localhost:8989  
SONARR_API_KEY=your-sonarr-api-key

# TMDB Configuration (optional)
TMDB_API_KEY=your-tmdb-api-key

# Plex Configuration (optional)
PLEX_URL=http://localhost:32400
PLEX_API_KEY=your-plex-api-key

# Authentication Configuration (required for SSE mode, recommended for HTTP mode)
MCP_AUTH_TOKEN=your-secure-auth-token

# Tool Configuration (all optional)
TOOL_PROFILE=default          # Predefined profile: default, minimal, curator, maintainer, power-user, full
TOOL_BRANCHES=discovery-add   # Comma-separated branches to enable
TOOL_EXCLUDE=radarr_disk_scan # Comma-separated tools to exclude
TOOL_INCLUDE=tmdb_search_movies # Comma-separated tools to force-include (overrides other settings)
TOOL_CONFIG_PATH=./tools.json # Path to JSON configuration file for tool settings
```

### API Key Acquisition

- **Radarr/Sonarr**: Found in Settings → General → Security → API Key
- **TMDB**: Free account at [TMDB](https://www.themoviedb.org/), then Settings → API → Create API Key
- **Plex**: Found in Settings → Account → Privacy → X-Plex-Token

## Important Implementation Notes

- The server tests API connections on startup but continues running even if services are unavailable
- Tools are registered directly on the `McpServer` via `server.registerTool()` during setup
- Each service's tools are only registered if that service is properly configured
- Radarr and Sonarr use the same base URL + endpoint pattern with API key authentication via `X-Api-Key` header
- TMDB uses direct API access with `Authorization: Bearer {api_key}` header authentication
- Plex uses direct API access with `X-Plex-Token` header authentication
- **SSE Mode Security**: SSE mode requires `MCP_AUTH_TOKEN` environment variable and validates Bearer tokens on all endpoints except `/health`
- **Streamable HTTP Mode Security**: HTTP mode requires `MCP_AUTH_TOKEN` when binding to non-loopback addresses. When set, all endpoints except `/health` require a valid Bearer token. Localhost development (`--host 127.0.0.1`) can run without auth.

## Available Tools by Service

### Radarr Tools (when `RADARR_URL` and `RADARR_API_KEY` are configured)

#### Movie Management

- `radarr_search_movie`: Search for movies in The Movie Database via Radarr
- `radarr_add_movie`: Add a movie to your library
- `radarr_get_movies`: List all movies in your library
- `radarr_get_movie`: Get details of a specific movie
- `radarr_delete_movie`: Remove a movie from your library

#### Queue and Downloads

- `radarr_get_queue`: View current download queue
- `radarr_search_movie_releases`: Search for releases of a specific movie

#### System Management

- `radarr_get_configuration`: Get Radarr configuration including quality profiles, root folders, and tags
- `radarr_get_system_status`: Get system information
- `radarr_get_health`: Check system health
- `radarr_refresh_movie`: Refresh movie metadata
- `radarr_update_movie`: Update a movie's settings (quality profile, monitoring, etc.)
- `radarr_refresh_all_movies`: Refresh metadata for all movies in the library
- `radarr_disk_scan`: Rescan all movie folders for new/missing files

### Sonarr Tools (when `SONARR_URL` and `SONARR_API_KEY` are configured)

#### Series Management

- `sonarr_search_series`: Search for TV series
- `sonarr_add_series`: Add a TV series to your library
- `sonarr_get_series`: List all series in your library
- `sonarr_get_series_by_id`: Get details of a specific series
- `sonarr_delete_series`: Remove a series from your library

#### Episode Management

- `sonarr_get_episodes`: Get episodes for a series
- `sonarr_get_episode`: Get details of a specific episode by ID
- `sonarr_update_episode_monitoring`: Change episode monitoring status
- `sonarr_get_calendar`: View upcoming episodes
- `sonarr_search_series_episodes`: Search for all episodes of a series
- `sonarr_search_season`: Search for episodes of a specific season
- `sonarr_search_episodes`: Search for specific episodes by IDs

#### Queue and Downloads

- `sonarr_get_queue`: View current download queue

#### System Management

- `sonarr_get_configuration`: Get Sonarr configuration including quality profiles and root folders
- `sonarr_get_system_status`: Get system information
- `sonarr_get_health`: Check system health
- `sonarr_refresh_series`: Refresh series metadata
- `sonarr_update_series`: Update a series' settings (quality profile, monitoring, etc.)
- `sonarr_refresh_all_series`: Refresh metadata for all series in the library
- `sonarr_disk_scan`: Rescan all series folders for new/missing files

### TMDB Tools (when `TMDB_API_KEY` is configured)

#### Search and Discovery

- `tmdb_search_movies`: Search for movies on TMDB by title
- `tmdb_search_tv`: Search for TV shows on TMDB by title
- `tmdb_search_multi`: Search for movies, TV shows, and people in a single request
- `tmdb_get_popular_movies`: Get popular movies
- `tmdb_discover_movies`: Discover movies based on various criteria (genre, year, rating, etc.)
- `tmdb_discover_tv`: Discover TV shows based on various criteria

#### Trending Content

- `tmdb_get_trending`: Get trending movies, TV shows, or people by time window (day/week)

#### Movie Lists

- `tmdb_get_now_playing_movies`: Get movies currently playing in theaters
- `tmdb_get_top_rated_movies`: Get top rated movies
- `tmdb_get_upcoming_movies`: Get upcoming movie releases

#### TV Show Lists

- `tmdb_get_popular_tv`: Get popular TV shows
- `tmdb_get_top_rated_tv`: Get top rated TV shows
- `tmdb_get_on_the_air_tv`: Get TV shows currently on the air
- `tmdb_get_airing_today_tv`: Get TV shows airing today

#### Content Details

- `tmdb_get_movie_details`: Get detailed information about a specific movie
- `tmdb_get_tv_details`: Get detailed information about a specific TV show

#### Recommendations and Similar Content

- `tmdb_get_movie_recommendations`: Get movie recommendations based on a specific movie
- `tmdb_get_tv_recommendations`: Get TV show recommendations based on a specific show
- `tmdb_get_similar_movies`: Get movies similar to a specific movie
- `tmdb_get_similar_tv`: Get TV shows similar to a specific show

#### People Discovery

- `tmdb_search_people`: Search for people (actors, directors, etc.)
- `tmdb_get_popular_people`: Get popular people in the entertainment industry
- `tmdb_get_person_details`: Get detailed information about a specific person
- `tmdb_get_person_movie_credits`: Get a person's movie credits
- `tmdb_get_person_tv_credits`: Get a person's TV show credits

#### Collections and Keywords

- `tmdb_search_collections`: Search for movie collections
- `tmdb_get_collection_details`: Get details about a specific movie collection
- `tmdb_search_keywords`: Search for keywords
- `tmdb_get_movies_by_keyword`: Get movies associated with a specific keyword

#### Certifications and Watch Providers

- `tmdb_get_certifications`: Get movie or TV certifications by country
- `tmdb_get_watch_providers`: Get watch provider information for a movie or TV show

#### External ID Integration

- `tmdb_find_by_external_id`: Find TMDB content by external ID (TVDB ID, etc.)

#### Configuration and Metadata

- `tmdb_get_genres`: Get list of available genres for movies or TV shows
- `tmdb_get_configuration`: Get TMDB API configuration including image base URLs
- `tmdb_get_countries`: Get list of countries used in TMDB
- `tmdb_get_languages`: Get list of languages used in TMDB

#### Cast and Crew Information

- `tmdb_get_movie_credits`: Get cast and crew for a movie
- `tmdb_get_tv_credits`: Get cast and crew for a TV show

### Plex Tools (when `PLEX_URL` and `PLEX_API_KEY` are configured)

#### System Information

- `plex_get_capabilities` - Get Plex server capabilities, version, and system information

#### Library Management

- `plex_get_libraries` - List all media libraries available on the Plex server
- `plex_refresh_library` - Trigger a refresh of a specific library to scan for new content
- `plex_get_library_items` - Browse and filter items in a library section (supports filtering by studio, genre, year, and sorting)

#### Search and Discovery

- `plex_search` - Search across all Plex libraries for movies, TV shows, and other content with optional type filters
- `plex_get_metadata` - Get detailed metadata for a specific movie, TV show, or other media item

#### Collection Management

- `plex_get_collections` - List all collections in a library section
- `plex_get_collection_items` - Get all items in a specific collection
- `plex_create_collection` - Create a new collection with initial items
- `plex_add_to_collection` - Add items to an existing collection
- `plex_remove_from_collection` - Remove a single item from a collection
- `plex_delete_collection` - Delete an entire collection

## Tool Implementation Pattern

All tool files follow the same pattern:

1. **Zod Schemas**: Define parameter validation schemas at the top
2. **createXXXTools()**: Function that registers tools directly on the `McpServer`, checking `isToolEnabled()` before each registration
3. **Single File**: Each service's tools are defined and registered from a single file

Example structure:

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Tool registration (with config injection and filtering)
export function createServiceTools(
  server: McpServer,
  config: Readonly<ServiceConfig>,
  isToolEnabled: (toolName: string) => boolean,
): void {
  if (isToolEnabled("service_tool_name")) {
    server.registerTool(
      "service_tool_name",
      {
        title: "Tool title",
        description: "Tool description",
        inputSchema: {
          param: z.string().describe("Parameter description"),
        },
      },
      async (args) => {
        // Tool handler with config captured via closure
        const result = await serviceClient.doSomething(config, args.param);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      },
    );
  }
}
```

## Logging

The project uses [LogTape](https://logtape.org/) for structured logging with the following features:

### Debug Mode

Enable verbose logging with the `--debug` flag:

```bash
# Development with debug logging
deno task dev --debug
deno task start --debug 
deno task dev:sse --debug
```

### Log Categories

- **media-server-mcp**: Main application logs
- **media-server-mcp.connection**: Service connection tests
- **media-server-mcp.tools**: Tool configuration and registration
- **media-server-mcp.transport.stdio**: STDIO transport logs
- **media-server-mcp.transport.sse**: SSE transport logs
- **media-server-mcp.transport.streamable-http**: Streamable HTTP transport logs
- **radarr**: Radarr client library logs
- **sonarr**: Sonarr client library logs
- **tmdb**: TMDB client library logs
- **plex**: Plex client library logs

### Log Levels

- **trace**: Most verbose, rarely used
- **debug**: Development debugging (enabled with --debug flag)
- **info**: General application information
- **warn**: Warning conditions that don't halt execution
- **error**: Error conditions
- **fatal**: Critical errors causing application termination

### STDIO Mode Requirements

When running in STDIO mode (default), all log output goes to stderr to avoid interfering with MCP protocol communication on stdout. This is automatically configured when not using `--sse` mode.

### Adding Logging to Code

```typescript
import { getLogger } from "../logging.ts";

const logger = getLogger(["media-server-mcp", "your-module"]);

// Structured logging with properties
logger.info("Service started", { port: 3000, mode: "sse" });
logger.debug("Processing request", { toolName, sessionId });
logger.warn("Connection failed", { error: error.message, retryCount });
logger.error("Critical error", { error: error.message, stack: error.stack });
```
