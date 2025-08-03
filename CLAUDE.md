# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Type checking - Always run before committing
deno task check

# Linting - Always run before committing  
deno task lint

# Code formatting
deno task fmt

# Run tests
deno test --allow-net

# Development with hot reload
deno task dev

# Production run
deno task start
```

## Development Best Practices

- Always use `deno task fmt`, `deno task lint`, and `deno task check` after modifying or creating code to ensure that it's correct.
- Run `deno test --allow-net` to verify all tests pass before committing changes.
- Tests are organized by layer: `tests/clients/`, `tests/tools/`, and `tests/server_test.ts`.

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides AI assistants with tools to manage Radarr (movies), Sonarr (TV series) media servers, and IMDB data through their APIs.

### Core Architecture Pattern

The codebase follows a **layered architecture**:

1. **MCP Server Layer** (`src/index.ts`): Main server that handles MCP protocol communication
2. **Tool Layer** (`src/tools/`): MCP tool definitions and handlers that bridge MCP and API clients
3. **Client Layer** (`src/clients/`): HTTP API clients for Radarr, Sonarr, and IMDB services
4. **Type Layer** (`src/types/`): TypeScript definitions for all interfaces

### Key Architectural Decisions

**Separation of Tool Creation and Execution**: Tools are created as metadata-only definitions via `createRadarrTools()`, `createSonarrTools()`, and `createIMDBTools()` functions that don't require client configurations. Tool execution happens separately through `handleRadarrTool()`, `handleSonarrTool()`, and `handleIMDBTool()` functions that receive the service configurations at runtime.

**Configuration Injection**: The main server maintains optional service configurations (`radarrConfig`, `sonarrConfig`, `imdbConfig`) and injects them into tool handlers during execution, allowing the server to work with any combination of services configured.

**Environment-Based Configuration**: Service availability is determined by environment variables at startup. Missing configuration results in that service's tools being unavailable rather than failing the entire server.

### Type System

- **Strict TypeScript**: Uses `exactOptionalPropertyTypes: true` - optional properties must be explicitly `| undefined` rather than using `?:`
- **Zod Validation**: All tool parameters use Zod schemas for runtime validation
- **API Type Definitions**: Comprehensive interfaces for Radarr, Sonarr, and IMDB API responses in `src/types/`

### HTTP Client Pattern

All clients use a **functional architecture** rather than classes:

- **Configuration Objects**: Each service uses config objects (`RadarrConfig`, `SonarrConfig`, `IMDBConfig`) created by factory functions (`createRadarrConfig()`, `createSonarrConfig()`, `createIMDBConfig()`)
- **HTTP Communication**: Each client has a private `makeRequest<T>()` function that handles all HTTP communication
- **Public Functions**: Individual functions (`getMovies()`, `addMovie()`, `searchIMDB()`, etc.) are exported functions that accept config objects and call `makeRequest`
- **Async Patterns**: Functions that only call `makeRequest` without additional `await` should NOT be marked `async`
- **Connection Testing**: Each client exports a `testConnection()` function that returns `{ success: boolean; error?: string }`

**IMDB Client Specifics**: Uses RapidAPI headers (`X-RapidAPI-Key`, `X-RapidAPI-Host`) for authentication instead of direct API key headers.

### Error Handling Pattern

- Unknown errors must be handled with `error instanceof Error ? error.message : String(error)`
- Tool handlers catch all errors and return `MCPToolResult` with `isError: true`
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

# IMDB Configuration via RapidAPI (optional)
IMDB_URL=https://imdb236.p.rapidapi.com/api/imdb
RAPIDAPI_KEY=your-rapidapi-key
```

## Important Implementation Notes

- The server tests API connections on startup but continues running even if services are unavailable
- Tool execution happens through a routing system in the main server's `CallToolRequestSchema` handler
- Each service's tools are only registered if that service is properly configured
- Radarr and Sonarr use the same base URL + endpoint pattern with API key authentication via `X-Api-Key` header
- IMDB uses RapidAPI with `X-RapidAPI-Key` and `X-RapidAPI-Host` headers for authentication

## IMDB Tools Available

The following IMDB tools are available when `RAPIDAPI_KEY` is configured:

- `imdb_search`: Search for movies and TV shows by title
- `imdb_get_details`: Get detailed information about a movie/show using IMDB ID
- `imdb_get_top_movies`: Retrieve IMDB Top 250 movies
- `imdb_get_popular_movies`: Get currently popular movies
- `imdb_get_popular_tv_shows`: Get currently popular TV shows
- `imdb_get_cast`: Get cast and crew information for a movie/show
