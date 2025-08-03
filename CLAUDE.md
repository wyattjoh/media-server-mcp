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

# Development with hot reload
deno task dev

# Production run
deno task start
```

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides AI assistants with tools to manage Radarr (movies) and Sonarr (TV series) media servers through their APIs.

### Core Architecture Pattern

The codebase follows a **layered architecture**:

1. **MCP Server Layer** (`src/index.ts`): Main server that handles MCP protocol communication
2. **Tool Layer** (`src/tools/`): MCP tool definitions and handlers that bridge MCP and API clients
3. **Client Layer** (`src/clients/`): HTTP API clients for Radarr and Sonarr services  
4. **Type Layer** (`src/types/`): TypeScript definitions for all interfaces

### Key Architectural Decisions

**Separation of Tool Creation and Execution**: Tools are created as metadata-only definitions via `createRadarrTools()` and `createSonarrTools()` functions that don't require client instances. Tool execution happens separately through `handleRadarrTool()` and `handleSonarrTool()` functions that receive the client at runtime.

**Client Injection**: The main server class maintains optional client instances (`radarrClient`, `sonarrClient`) and injects them into tool handlers during execution, allowing the server to work with either or both services configured.

**Environment-Based Configuration**: Service availability is determined by environment variables at startup. Missing configuration results in that service's tools being unavailable rather than failing the entire server.

### Type System

- **Strict TypeScript**: Uses `exactOptionalPropertyTypes: true` - optional properties must be explicitly `| undefined` rather than using `?:`
- **Zod Validation**: All tool parameters use Zod schemas for runtime validation
- **API Type Definitions**: Comprehensive interfaces for Radarr and Sonarr API responses in `src/types/`

### HTTP Client Pattern

Both `RadarrClient` and `SonarrClient` follow the same pattern:
- Single `makeRequest<T>()` method handles all HTTP communication
- Individual methods (`getMovies()`, `addMovie()`, etc.) are thin wrappers that call `makeRequest`
- Methods that only call `makeRequest` without `await` should NOT be marked `async`

### Error Handling Pattern

- Unknown errors must be handled with `error instanceof Error ? error.message : String(error)`
- Tool handlers catch all errors and return `MCPToolResult` with `isError: true`
- Connection testing on startup logs warnings but doesn't prevent server launch

## Environment Variables

At least one service must be configured:

```bash
RADARR_URL=http://localhost:7878
RADARR_API_KEY=your-radarr-api-key
SONARR_URL=http://localhost:8989  
SONARR_API_KEY=your-sonarr-api-key
```

## Important Implementation Notes

- The server tests API connections on startup but continues running even if services are unavailable
- Tool execution happens through a routing system in the main server's `CallToolRequestSchema` handler
- Each service's tools are only registered if that service is properly configured
- All API clients use the same base URL + endpoint pattern with API key authentication via `X-Api-Key` header