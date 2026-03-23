# MCP Improvements Design

## Overview

Two PRs to modernize the media-server-mcp project: one for dependency
updates, one for MCP spec adoption and architectural improvements.

## PR 1: Dependency Updates + Hoist Shared Deps

### Scope

- Update all dependencies to latest versions across all 5 workspace packages
- Hoist `@logtape/logtape` from per-package imports to root `deno.json`
  imports map
- Hoist `@std/assert` (currently inlined in test files) to root `deno.json`
  imports map
- Fix any breakage from dependency updates
- Verify `deno check`, `deno lint`, `deno fmt`, and `deno test --allow-net`
  all pass

### Design decisions

- No behavior changes. Purely mechanical.
- Hoisting shared deps reduces version duplication. Each package still
  inherits from root imports automatically via Deno workspaces.

## PR 2: MCP Improvements

All feature improvements in a single PR, organized into the following
subsections.

### 2a. Tool Handler Wrapper

**File**: `packages/media-server-mcp/src/tools/tool-wrapper.ts`

A higher-order function that wraps every tool handler callback to centralize:

- **Error handling**: Catch block with `isError: true` on all error responses.
  Currently, error responses omit the `isError` flag, making them
  indistinguishable from successful text responses to MCP clients.
- **Upstream timeouts**: Passes timeout context so handlers can abort long
  requests.
- **Logging**: Structured log entry for each tool invocation (tool name,
  duration, success/failure).

The wrapper wraps the third argument (the callback) passed to
`server.registerTool()`. The SDK's callback type is
`ToolCallback<Args>` with signature
`(args: ShapeOutput<Args>, extra: Extra) => CallToolResult | Promise<CallToolResult>`.

Shape:

```typescript
function wrapToolHandler<Args>(
  toolName: string,
  handler: (
    args: Args,
    extra: Extra,
  ) => CallToolResult | Promise<CallToolResult>,
): (args: Args, extra: Extra) => Promise<CallToolResult> {
  return async (args, extra) => {
    const start = performance.now();
    try {
      const result = await handler(args, extra);
      logger.debug("Tool completed", {
        toolName,
        durationMs: performance.now() - start,
      });
      return result;
    } catch (error) {
      logger.error("Tool failed", {
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        content: [{
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        }],
        isError: true,
      };
    }
  };
}
```

Usage at each registration site:

```typescript
server.registerTool(
  "radarr_search_movie",
  { title: "...", description: "...", inputSchema: { ... }, outputSchema, annotations },
  wrapToolHandler("radarr_search_movie", async (args) => {
    // handler logic, no try/catch needed
  }),
);
```

Applied in each `createXXXTools()` function, replacing the duplicated
try/catch blocks across all 70+ handlers.

### 2b. Upstream Request Timeouts

Add `AbortSignal.timeout()` to the `makeRequest` function in each client
package (radarr, sonarr, tmdb, plex).

- Default timeout: 30 seconds
- Applied at the `fetch()` call site in each client's `makeRequest` function
- Hardcoded constant per client (can differ per service if needed)
- No configuration surface initially
- If a caller-provided `AbortSignal` is available in the future, compose
  with `AbortSignal.any()` for forward compatibility

### 2c. Tool Annotations

Add `annotations` to every `registerTool()` call across all 4 service files.

Mapping:

| Annotation              | Tools                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `readOnlyHint: true`    | All `get_*`, `search_*`, `discover_*`, `find_*`, calendar, queue, config |
| `destructiveHint: true` | `delete_movie`, `delete_series`, `delete_collection`, `remove_from_*`    |
| `idempotentHint: true`  | `refresh_*`, `update_*`, `disk_scan`, `refresh_library`                  |
| `openWorldHint: false`  | All tools (only interact with known configured services)                 |

Tools not listed in the table above (e.g., `add_movie`, `add_series`,
`create_collection`, `add_to_collection`) get only
`openWorldHint: false`. They are not read-only, not destructive, and not
idempotent (adding twice creates duplicates).

### 2d. Structured Output Schemas

Add `outputSchema` (Zod) and return `structuredContent` alongside the
existing `content` text for each tool.

For each tool:

1. Define a Zod schema matching the shape currently `JSON.stringify`'d in the
   response
2. Return both `content` (text) and `structuredContent` (typed object)

```typescript
return {
  content: [{ type: "text", text: JSON.stringify(result) }],
  structuredContent: result,
};
```

For tools returning simple text messages (e.g., "Movie deleted
successfully"), use `{ message: z.string() }`.

**Array responses**: `structuredContent` must be a `Record<string, unknown>`
(object), not an array. Tools that currently return arrays (e.g.,
`radarr_get_movies` returns a list) must wrap them:
`{ items: arrayResult, total: arrayResult.length }`. The output schema
should reflect this wrapper shape.

This is the most labor-intensive change since it touches every handler, but
it is mechanical.

### 2e. MCP Resources

**Directory**: `packages/media-server-mcp/src/resources/`

One file per service, each exporting
`createXXXResources(server, config)` that registers resources on the
McpServer. Server capabilities updated to include `resources: {}`.

Each `registerResource()` call includes a `ResourceMetadata` object with
at minimum a `description` and `mimeType` field (third argument to
`registerResource`).

**Static resources** (via `server.registerResource()`):

- `config://radarr` -- Quality profiles, root folders, tags
- `config://sonarr` -- Quality profiles, root folders, tags
- `config://tmdb` -- TMDB API configuration (image base URLs)
- `tmdb://genres/movies` -- Movie genre list
- `tmdb://genres/tv` -- TV genre list
- `plex://libraries` -- Available Plex libraries

**Templated resources** (via `ResourceTemplate`):

- `radarr://movies/{movieId}` -- Individual movie details
- `sonarr://series/{seriesId}` -- Individual series details
- `plex://collections/{collectionId}` -- Collection items

Only resources for configured services get registered.

### 2f. MCP Prompt Templates

**Directory**: `packages/media-server-mcp/src/prompts/`

One file per workflow, each exporting
`createXXXPrompts(server, config)`. Server capabilities updated to include
`prompts: {}`. Only prompts for configured services get registered.

**Prompts**:

- `add-movie` -- Guided workflow: search TMDB, check Radarr, select quality
  profile/root folder, add. The prompt handler calls client functions
  directly (e.g., `radarrClient.getQualityProfiles()`) to build context,
  including the same data that `config://radarr` exposes.
- `add-series` -- Same flow for Sonarr.
- `library-report` -- Summary of library status across services (counts,
  monitored vs unmonitored, missing files).
- `recommendations` -- Personalized recommendations based on existing library
  using TMDB similar/recommendation APIs.

### 2g. SSE Transport Deprecation

- Add `logger.warn("SSE transport is deprecated...")` on SSE server startup,
  pointing users to Streamable HTTP (`--http`)
- Update README.md to mark SSE as deprecated
- No code removal, backwards compatibility preserved

### 2h. Test Coverage

New tests alongside the features above:

- **Tool wrapper tests**: Verify wrapper adds `isError: true` on errors, logs
  correctly, handles timeouts
- **Resource tests**: Verify resources register for each service, return
  expected data shapes with mocked clients
- **Prompt tests**: Verify prompts register correctly, return valid
  `PromptMessage` arrays
- **Mocked tool execution tests**: Stub `fetch` via `@std/testing/mock`, test
  2-3 tools per service covering happy path, error path, and validation
- **Client timeout tests**: Verify `makeRequest` respects timeout and
  produces a meaningful error

Tests follow existing conventions: kebab-case with `_test.ts` suffix,
organized in the appropriate package's `tests/` directory.

## Files Changed (PR 2)

### New files

- `packages/media-server-mcp/src/tools/tool-wrapper.ts`
- `packages/media-server-mcp/src/resources/radarr-resources.ts`
- `packages/media-server-mcp/src/resources/sonarr-resources.ts`
- `packages/media-server-mcp/src/resources/tmdb-resources.ts`
- `packages/media-server-mcp/src/resources/plex-resources.ts`
- `packages/media-server-mcp/src/prompts/add-movie-prompt.ts`
- `packages/media-server-mcp/src/prompts/add-series-prompt.ts`
- `packages/media-server-mcp/src/prompts/library-report-prompt.ts`
- `packages/media-server-mcp/src/prompts/recommendations-prompt.ts`
- `packages/media-server-mcp/tests/tools/tool-wrapper_test.ts`
- `packages/media-server-mcp/tests/resources/radarr-resources_test.ts`
- `packages/media-server-mcp/tests/resources/sonarr-resources_test.ts`
- `packages/media-server-mcp/tests/resources/tmdb-resources_test.ts`
- `packages/media-server-mcp/tests/resources/plex-resources_test.ts`
- `packages/media-server-mcp/tests/prompts/prompts_test.ts`
- `packages/media-server-mcp/tests/tools/radarr-tools-execution_test.ts`
- `packages/media-server-mcp/tests/tools/sonarr-tools-execution_test.ts`
- `packages/media-server-mcp/tests/tools/tmdb-tools-execution_test.ts`
- `packages/media-server-mcp/tests/tools/plex-tools-execution_test.ts`
- `packages/radarr/tests/timeout_test.ts`
- `packages/sonarr/tests/timeout_test.ts`
- `packages/tmdb/tests/timeout_test.ts`
- `packages/plex/tests/timeout_test.ts`

### Modified files

- `packages/media-server-mcp/src/index.ts` -- Add resources and prompts
  capabilities, call resource/prompt registration functions
- `packages/media-server-mcp/src/tools/radarr-tools.ts` -- Use
  `wrapToolHandler`, add annotations, add output schemas, add
  `structuredContent`
- `packages/media-server-mcp/src/tools/sonarr-tools.ts` -- Same
- `packages/media-server-mcp/src/tools/tmdb-tools.ts` -- Same
- `packages/media-server-mcp/src/tools/plex-tools.ts` -- Same
- `packages/media-server-mcp/src/transports/sse.ts` -- Add deprecation
  warning
- `packages/radarr/src/client.ts` -- Add `AbortSignal.timeout(30_000)` to
  fetch
- `packages/sonarr/src/client.ts` -- Same
- `packages/tmdb/src/client.ts` -- Same
- `packages/plex/src/client.ts` -- Same
- `README.md` -- Mark SSE as deprecated
- `CLAUDE.md` -- Update to reflect new resources, prompts, tool wrapper
  pattern, annotations, structured output, and updated architecture
  descriptions

## Out of Scope

- Switching to `@glama/fastmcp` or Hono for transports
- SDK v2 migration (not yet stable)
- Changing validation from Zod
- OAuth authentication (overkill for self-hosted)
- Middleware abstraction layer (wrapper function is sufficient)
