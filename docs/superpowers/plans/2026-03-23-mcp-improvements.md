# MCP Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the media-server-mcp project by updating dependencies
and adopting MCP spec features (tool annotations, structured output,
resources, prompts, error handling improvements).

**Architecture:** Two PRs. PR 1 updates dependencies and hoists shared
imports to the root workspace config. PR 2 adds a tool handler wrapper for
centralized error handling, upstream request timeouts, tool annotations,
structured output schemas, MCP resources, MCP prompts, SSE deprecation
warnings, and comprehensive test coverage.

**Tech Stack:** Deno 2.x, `@modelcontextprotocol/sdk` v1.x, Zod v4,
LogTape, `@std/testing/mock` for test mocking.

**Spec:** `docs/superpowers/specs/2026-03-23-mcp-improvements-design.md`

---

## PR 1: Dependency Updates + Hoist Shared Deps

### Task 1: Create feature branch and update dependencies

**Files:**

- Modify: `packages/radarr/deno.json`
- Modify: `packages/sonarr/deno.json`
- Modify: `packages/tmdb/deno.json`
- Modify: `packages/plex/deno.json`
- Modify: `packages/media-server-mcp/deno.json`
- Modify: `deno.json` (root)

- [ ] **Step 1: Create branch**

```bash
git checkout -b chore/update-deps
```

- [ ] **Step 2: Check latest versions of all dependencies**

Check latest versions on JSR and npm for:

- `@logtape/logtape` (currently `^2.0.4`)
- `@modelcontextprotocol/sdk` (currently `^1.27.1`)
- `@std/dotenv` (currently `^0.225.6`)
- `zod` (currently `^4.3.6`)
- `@cliffy/command` (currently `^1.0.0`)
- `@std/assert` (currently `^1.0.0` inline in test files)

Use `deno info` or check JSR/npm directly.

- [ ] **Step 3: Hoist `@logtape/logtape` to root `deno.json`**

Add an `imports` field to the root `deno.json` with the latest
`@logtape/logtape` version. Remove the `@logtape/logtape` import from each
of the 5 package `deno.json` files (radarr, sonarr, tmdb, plex,
media-server-mcp). The workspace inheritance means all packages will pick up
the root import automatically.

- [ ] **Step 4: Hoist `@std/assert` to root `deno.json`**

Add `@std/assert` to the root `deno.json` imports. Then update all test
files that use inline `jsr:@std/assert@^1.0.0` imports to use bare
`@std/assert` instead. Files to update:

- `packages/media-server-mcp/tests/server_test.ts`
- `packages/media-server-mcp/tests/auth_test.ts`
- `packages/media-server-mcp/tests/sse-transport_test.ts`
- `packages/media-server-mcp/tests/streamable-http-transport_test.ts`
- `packages/media-server-mcp/tests/tools/radarr-tools_test.ts`
- `packages/media-server-mcp/tests/tools/sonarr-tools_test.ts`
- `packages/media-server-mcp/tests/tools/tmdb-tools_test.ts`
- `packages/radarr/tests/client_test.ts`
- `packages/radarr/tests/filters_test.ts`
- `packages/sonarr/tests/client_test.ts`
- `packages/sonarr/tests/filters_test.ts`
- `packages/plex/tests/client_test.ts`

Search for any other test files with inline `@std/assert` imports and update
them too.

- [ ] **Step 5: Update all dependency versions**

Update each remaining per-package dependency in the appropriate `deno.json`
to the latest version. The `media-server-mcp` package still needs its own
imports for `@modelcontextprotocol/sdk`, `@std/dotenv`, `zod`, and
`@cliffy/command`.

- [ ] **Step 6: Run checks and fix any breakage**

```bash
deno check
deno fmt
deno lint
deno test --allow-net --allow-env
```

Fix any type errors, API changes, or deprecation issues from the version
bumps. Common things to watch for:

- Zod v4 API changes
- MCP SDK API signature changes
- LogTape configuration changes

- [ ] **Step 7: Commit and push**

```bash
git add deno.json packages/*/deno.json packages/*/tests/*_test.ts packages/media-server-mcp/tests/**/*_test.ts
git commit -m "chore: update all dependencies to latest and hoist shared imports"
git push -u origin chore/update-deps
```

- [ ] **Step 8: Create PR**

Create PR targeting `main` with title:
`chore: update all dependencies to latest and hoist shared imports`

---

## PR 2: MCP Improvements

### Task 2: Create feature branch from updated main

- [ ] **Step 1: Ensure PR 1 is merged, then branch from main**

```bash
git checkout main
git pull origin main
git checkout -b feat/mcp-improvements
```

---

### Task 3: Tool handler wrapper + tests

**Files:**

- Create: `packages/media-server-mcp/src/tools/tool-wrapper.ts`
- Create: `packages/media-server-mcp/tests/tools/tool-wrapper_test.ts`

- [ ] **Step 1: Write the failing test for wrapToolHandler**

Create `packages/media-server-mcp/tests/tools/tool-wrapper_test.ts`:

```typescript
import { assertEquals } from "@std/assert";
import { wrapToolHandler } from "../../src/tools/tool-wrapper.ts";

Deno.test("wrapToolHandler returns handler result on success", async () => {
  const handler = wrapToolHandler("test_tool", async () => ({
    content: [{ type: "text" as const, text: "ok" }],
  }));
  const result = await handler({}, {} as never);
  assertEquals(result.content, [{ type: "text", text: "ok" }]);
  assertEquals(result.isError, undefined);
});

Deno.test("wrapToolHandler sets isError true on thrown Error", async () => {
  const handler = wrapToolHandler("test_tool", async () => {
    throw new Error("boom");
  });
  const result = await handler({}, {} as never);
  assertEquals(result.isError, true);
  assertEquals(result.content[0].type, "text");
});

Deno.test("wrapToolHandler handles non-Error throws", async () => {
  const handler = wrapToolHandler("test_tool", async () => {
    throw "string error";
  });
  const result = await handler({}, {} as never);
  assertEquals(result.isError, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
deno test packages/media-server-mcp/tests/tools/tool-wrapper_test.ts --allow-net --allow-env
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement wrapToolHandler**

Create `packages/media-server-mcp/src/tools/tool-wrapper.ts`:

```typescript
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getLogger } from "../logging.ts";

const logger = getLogger(["media-server-mcp", "tools"]);

export function wrapToolHandler<Args, Extra>(
  toolName: string,
  handler: (
    args: Args,
    extra: Extra,
  ) => CallToolResult | Promise<CallToolResult>,
): (args: Args, extra: Extra) => Promise<CallToolResult> {
  return async (args: Args, extra: Extra): Promise<CallToolResult> => {
    const start = performance.now();
    try {
      const result = await handler(args, extra);
      logger.debug("Tool completed: {toolName}", {
        toolName,
        durationMs: Math.round(performance.now() - start),
      });
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Tool failed: {toolName}: {error}", {
        toolName,
        error: message,
        durationMs: Math.round(performance.now() - start),
      });
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
deno test packages/media-server-mcp/tests/tools/tool-wrapper_test.ts --allow-net --allow-env
```

Expected: 3 tests PASS

- [ ] **Step 5: Run full checks**

```bash
deno check && deno fmt && deno lint
```

- [ ] **Step 6: Commit**

```bash
git add packages/media-server-mcp/src/tools/tool-wrapper.ts packages/media-server-mcp/tests/tools/tool-wrapper_test.ts
git commit -m "feat: add tool handler wrapper with centralized error handling"
```

---

### Task 4: Upstream request timeouts + tests

**Files:**

- Modify: `packages/radarr/src/client.ts`
- Modify: `packages/sonarr/src/client.ts`
- Modify: `packages/tmdb/src/client.ts`
- Modify: `packages/plex/src/client.ts`
- Create: `packages/radarr/tests/timeout_test.ts`
- Create: `packages/sonarr/tests/timeout_test.ts`
- Create: `packages/tmdb/tests/timeout_test.ts`
- Create: `packages/plex/tests/timeout_test.ts`

- [ ] **Step 1: Write failing timeout test for one client (radarr)**

Create `packages/radarr/tests/timeout_test.ts` that stubs `fetch` to hang
and verifies the request aborts within the timeout. Use
`@std/testing/mock` to stub the global `fetch`.

The test should verify that calling a client function with a server that
never responds produces an abort error within a reasonable time. Use a short
timeout constant for testing (override the default).

- [ ] **Step 2: Run test to verify it fails**

```bash
deno test packages/radarr/tests/timeout_test.ts --allow-net --allow-env
```

Expected: FAIL (no timeout behavior yet)

- [ ] **Step 3: Add AbortSignal.timeout to radarr makeRequest**

In `packages/radarr/src/client.ts`, find the `fetch()` call inside
`makeRequest` and add `signal: AbortSignal.timeout(30_000)`:

```typescript
const REQUEST_TIMEOUT_MS = 30_000;

const response = await fetch(url, {
  ...options,
  headers,
  signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
});
```

Export the constant so tests can reference it.

- [ ] **Step 4: Run test to verify it passes**

```bash
deno test packages/radarr/tests/timeout_test.ts --allow-net --allow-env
```

- [ ] **Step 5: Repeat for sonarr, tmdb, plex**

Apply the same pattern to:

- `packages/sonarr/src/client.ts`
- `packages/tmdb/src/client.ts`
- `packages/plex/src/client.ts`

Create matching timeout test files for each.

- [ ] **Step 6: Run full test suite**

```bash
deno test --allow-net --allow-env
```

- [ ] **Step 7: Commit**

```bash
git add packages/*/src/client.ts packages/*/tests/timeout_test.ts
git commit -m "feat: add 30s request timeouts to all API clients"
```

---

### Task 5: Apply tool wrapper + annotations to radarr-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/radarr-tools.ts`

This task serves as the template. The same pattern will be repeated for
sonarr, tmdb, and plex in subsequent tasks.

- [ ] **Step 1: Import wrapToolHandler in radarr-tools.ts**

Add import at top of file:

```typescript
import { wrapToolHandler } from "./tool-wrapper.ts";
```

- [ ] **Step 2: Add annotations to each tool registration**

For each `registerTool` call, add the `annotations` field to the config
object (second argument). Use the mapping from the spec:

The actual registered tools in `radarr-tools.ts` (11 total):

- `radarr_search_movie`: `{ readOnlyHint: true, openWorldHint: false }`
- `radarr_add_movie`: `{ openWorldHint: false }`
- `radarr_delete_movie`: `{ destructiveHint: true, openWorldHint: false }`
- `radarr_refresh_movie`: `{ idempotentHint: true, openWorldHint: false }`
- `radarr_search_movie_releases`: `{ idempotentHint: true, openWorldHint: false }` (triggers indexer search command, not read-only)
- `radarr_get_movies`: `{ readOnlyHint: true, openWorldHint: false }`
- `radarr_get_movie`: `{ readOnlyHint: true, openWorldHint: false }`
- `radarr_get_configuration`: `{ readOnlyHint: true, openWorldHint: false }`
- `radarr_update_movie`: `{ idempotentHint: true, openWorldHint: false }`
- `radarr_refresh_all_movies`: `{ idempotentHint: true, openWorldHint: false }`
- `radarr_disk_scan`: `{ idempotentHint: true, openWorldHint: false }`

Note: `radarr_get_queue`, `radarr_get_system_status`, and
`radarr_get_health` are documented in CLAUDE.md but are NOT registered in
the current codebase. Do not add annotations for them.

- [ ] **Step 3: Wrap each tool callback with wrapToolHandler**

For each `registerTool` call, wrap the third argument (the callback) with
`wrapToolHandler("tool_name", ...)` and remove the existing try/catch block
inside the callback. The wrapper handles error catching and `isError: true`.

Before:

```typescript
server.registerTool("radarr_search_movie", { ... },
  async (args) => {
    try {
      const results = await radarrClient.searchMovie(config, args.term);
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
    }
  },
);
```

After:

```typescript
server.registerTool("radarr_search_movie", { ... },
  wrapToolHandler("radarr_search_movie", async (args) => {
    const results = await radarrClient.searchMovie(config, args.term);
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }),
);
```

- [ ] **Step 4: Run checks**

```bash
deno check && deno fmt && deno lint
deno test --allow-net --allow-env
```

- [ ] **Step 5: Commit**

```bash
git add packages/media-server-mcp/src/tools/radarr-tools.ts
git commit -m "feat: add tool wrapper and annotations to radarr tools"
```

---

### Task 6: Apply tool wrapper + annotations to sonarr-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/sonarr-tools.ts`

Same pattern as Task 5. Import `wrapToolHandler`, add annotations per the
spec mapping, wrap all callbacks, remove try/catch blocks.

Sonarr annotation mapping (20 registered tools):

- Read-only: `sonarr_search_series`, `sonarr_get_series`,
  `sonarr_get_series_by_id`, `sonarr_get_episodes`, `sonarr_get_episode`,
  `sonarr_get_calendar`, `sonarr_get_queue`, `sonarr_get_configuration`,
  `sonarr_get_system_status`, `sonarr_get_health`
- Destructive: `sonarr_delete_series`
- Idempotent: `sonarr_refresh_series`, `sonarr_update_series`,
  `sonarr_update_episode_monitoring`, `sonarr_refresh_all_series`,
  `sonarr_disk_scan`, `sonarr_search_series_episodes` (triggers indexer
  search command), `sonarr_search_season` (triggers indexer search),
  `sonarr_search_episodes` (triggers indexer search)
- Create (openWorldHint only): `sonarr_add_series`

- [ ] **Step 1: Apply wrapper, annotations, remove try/catch**
- [ ] **Step 2: Run checks and tests**
- [ ] **Step 3: Commit**

```bash
git add packages/media-server-mcp/src/tools/sonarr-tools.ts
git commit -m "feat: add tool wrapper and annotations to sonarr tools"
```

---

### Task 7: Apply tool wrapper + annotations to tmdb-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/tmdb-tools.ts`

Same pattern. All TMDB tools are read-only (no mutations), so every tool
gets `{ readOnlyHint: true, openWorldHint: false }`.

- [ ] **Step 1: Apply wrapper, annotations, remove try/catch**
- [ ] **Step 2: Run checks and tests**
- [ ] **Step 3: Commit**

```bash
git add packages/media-server-mcp/src/tools/tmdb-tools.ts
git commit -m "feat: add tool wrapper and annotations to tmdb tools"
```

---

### Task 8: Apply tool wrapper + annotations to plex-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/plex-tools.ts`

Plex annotation mapping:

- Read-only: `get_capabilities`, `get_libraries`, `get_library_items`,
  `search`, `get_metadata`, `get_collections`, `get_collection_items`
- Destructive: `delete_collection`, `remove_from_collection`
- Idempotent: `refresh_library`
- Create (openWorldHint only): `create_collection`, `add_to_collection`

- [ ] **Step 1: Apply wrapper, annotations, remove try/catch**
- [ ] **Step 2: Run checks and tests**
- [ ] **Step 3: Commit**

```bash
git add packages/media-server-mcp/src/tools/plex-tools.ts
git commit -m "feat: add tool wrapper and annotations to plex tools"
```

---

### Task 9: Add structured output schemas to radarr-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/radarr-tools.ts`

- [ ] **Step 1: Define Zod output schemas for each radarr tool**

At the top of the file (after input schemas), define output schemas. For
tools that return arrays, wrap in `{ items: z.array(...), total: z.number() }`.
For tools that return single objects, define the object shape.
For tools that return simple messages, use `{ message: z.string() }`.

Read the current handler return values to determine the correct shapes.
Reference the types from `@wyattjoh/radarr` (e.g., `RadarrMovie`) to
understand the response shapes. The output schemas should be Zod schemas
matching these types.

- [ ] **Step 2: Add outputSchema to each registerTool config**

Add the `outputSchema` field to the second argument of each `registerTool`
call.

- [ ] **Step 3: Add structuredContent to each handler return**

For array responses:

```typescript
const items = await radarrClient.getMovies(config);
return {
  content: [{
    type: "text",
    text: JSON.stringify({ items, total: items.length }),
  }],
  structuredContent: { items, total: items.length },
};
```

For object responses:

```typescript
const movie = await radarrClient.getMovie(config, args.movieId);
return {
  content: [{ type: "text", text: JSON.stringify(movie) }],
  structuredContent: movie,
};
```

For message responses:

```typescript
return {
  content: [{ type: "text", text: "Movie deleted successfully" }],
  structuredContent: { message: "Movie deleted successfully" },
};
```

- [ ] **Step 4: Run checks and tests**

```bash
deno check && deno fmt && deno lint
deno test --allow-net --allow-env
```

- [ ] **Step 5: Commit**

```bash
git add packages/media-server-mcp/src/tools/radarr-tools.ts
git commit -m "feat: add structured output schemas to radarr tools"
```

---

### Task 10: Add structured output schemas to sonarr-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/sonarr-tools.ts`

Same pattern as Task 9. Define output schemas, add `outputSchema` to
configs, add `structuredContent` to returns.

- [ ] **Step 1-4: Apply pattern, run checks**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add structured output schemas to sonarr tools"
```

---

### Task 11: Add structured output schemas to tmdb-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/tmdb-tools.ts`

Same pattern. TMDB has the most tools (37) so this is the largest single
task. Many tools share similar response shapes (paginated results with
`page`, `total_pages`, `total_results`, `results`). Define shared output
schemas for paginated responses to avoid repetition.

- [ ] **Step 1-4: Apply pattern, run checks**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add structured output schemas to tmdb tools"
```

---

### Task 12: Add structured output schemas to plex-tools

**Files:**

- Modify: `packages/media-server-mcp/src/tools/plex-tools.ts`

Same pattern.

- [ ] **Step 1-4: Apply pattern, run checks**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add structured output schemas to plex tools"
```

---

### Task 13: Add MCP resources for radarr

**Files:**

- Create: `packages/media-server-mcp/src/resources/radarr-resources.ts`
- Create: `packages/media-server-mcp/tests/resources/radarr-resources_test.ts`

- [ ] **Step 1: Write failing test**

Create test that verifies `createRadarrResources` registers the expected
resources on a McpServer instance. Use the same test pattern as
`radarr-tools_test.ts` (create a real McpServer, call the registration
function, verify tools/resources are registered).

**Important:** When creating test-local McpServer instances for resource
tests, include `resources: {}` in the capabilities object. Similarly,
prompt tests must include `prompts: {}`. Without these, the SDK may reject
registrations.

Test should verify:

- `config://radarr` resource is registered
- `radarr://movies/{movieId}` template resource is registered

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement radarr-resources.ts**

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RadarrConfig } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

export function createRadarrResources(
  server: McpServer,
  config: Readonly<RadarrConfig>,
): void {
  // Static: Radarr configuration
  server.registerResource(
    "radarr-config",
    "config://radarr",
    {
      description:
        "Radarr configuration including quality profiles, root folders, and tags",
      mimeType: "application/json",
    },
    async (uri) => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        radarrClient.getQualityProfiles(config),
        radarrClient.getRootFolders(config),
      ]);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ qualityProfiles, rootFolders }),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Template: Individual movie details
  server.registerResource(
    "radarr-movie",
    new ResourceTemplate("radarr://movies/{movieId}", {
      list: undefined,
    }),
    {
      description: "Details for a specific movie in Radarr",
      mimeType: "application/json",
    },
    async (uri, { movieId }) => {
      const movie = await radarrClient.getMovie(config, Number(movieId));
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(movie),
          mimeType: "application/json",
        }],
      };
    },
  );
}
```

Adjust the exact client function names to match what's exported from
`@wyattjoh/radarr`. Read `packages/radarr/mod.ts` to verify exports.

- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Run full checks**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add MCP resources for radarr"
```

---

### Task 14: Add MCP resources for sonarr

**Files:**

- Create: `packages/media-server-mcp/src/resources/sonarr-resources.ts`
- Create: `packages/media-server-mcp/tests/resources/sonarr-resources_test.ts`

Same pattern as Task 13. Resources:

- `config://sonarr` (quality profiles, root folders)
- `sonarr://series/{seriesId}` (individual series details)

- [ ] **Step 1-5: Write test, implement, verify, commit**

```bash
git commit -m "feat: add MCP resources for sonarr"
```

---

### Task 15: Add MCP resources for tmdb

**Files:**

- Create: `packages/media-server-mcp/src/resources/tmdb-resources.ts`
- Create: `packages/media-server-mcp/tests/resources/tmdb-resources_test.ts`

Resources:

- `config://tmdb` (API configuration, image base URLs)
- `tmdb://genres/movies` (movie genre list)
- `tmdb://genres/tv` (TV genre list)

- [ ] **Step 1-5: Write test, implement, verify, commit**

```bash
git commit -m "feat: add MCP resources for tmdb"
```

---

### Task 16: Add MCP resources for plex

**Files:**

- Create: `packages/media-server-mcp/src/resources/plex-resources.ts`
- Create: `packages/media-server-mcp/tests/resources/plex-resources_test.ts`

Resources:

- `plex://libraries` (available libraries)
- `plex://collections/{collectionId}` (collection items)

- [ ] **Step 1-5: Write test, implement, verify, commit**

```bash
git commit -m "feat: add MCP resources for plex"
```

---

### Task 17: Add MCP prompt templates

**Files:**

- Create: `packages/media-server-mcp/src/prompts/add-movie-prompt.ts`
- Create: `packages/media-server-mcp/src/prompts/add-series-prompt.ts`
- Create: `packages/media-server-mcp/src/prompts/library-report-prompt.ts`
- Create: `packages/media-server-mcp/src/prompts/recommendations-prompt.ts`
- Create: `packages/media-server-mcp/tests/prompts/prompts_test.ts`

- [ ] **Step 1: Write failing test for prompt registration**

Test that each prompt registers correctly and returns a valid
`GetPromptResult` with `PromptMessage` arrays. Test one prompt end-to-end
(e.g., `add-movie`).

- [ ] **Step 2: Implement add-movie-prompt.ts**

The prompt handler calls client functions directly to build context. It
returns a `messages` array guiding the AI through the workflow.

```typescript
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RadarrConfig } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

export function createAddMoviePrompt(
  server: McpServer,
  config: Readonly<RadarrConfig>,
): void {
  server.registerPrompt(
    "add-movie",
    {
      title: "Add a Movie",
      description: "Guided workflow to search for and add a movie to Radarr",
    },
    async () => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        radarrClient.getQualityProfiles(config),
        radarrClient.getRootFolders(config),
      ]);
      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "I want to add a movie to my library. Please help me through these steps:",
              "1. Ask me what movie I'm looking for",
              "2. Search TMDB for the movie using tmdb_search_movies",
              "3. Show me the results and let me pick one",
              "4. Check if it's already in Radarr using radarr_get_movies",
              "5. If not already added, add it using radarr_add_movie",
              "",
              `Available quality profiles: ${
                JSON.stringify(
                  qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
                )
              }`,
              `Available root folders: ${
                JSON.stringify(
                  rootFolders.map((f) => ({ id: f.id, path: f.path })),
                )
              }`,
            ].join("\n"),
          },
        }],
      };
    },
  );
}
```

- [ ] **Step 3: Implement add-series-prompt.ts**

Same pattern using Sonarr client functions.

- [ ] **Step 4: Implement library-report-prompt.ts**

Returns a prompt asking the AI to gather and summarize library status across
all configured services.

- [ ] **Step 5: Implement recommendations-prompt.ts**

Returns a prompt asking the AI to use TMDB recommendation/similar APIs based
on existing library.

- [ ] **Step 6: Run tests and checks**

```bash
deno check && deno fmt && deno lint
deno test --allow-net --allow-env
```

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add MCP prompt templates for common workflows"
```

---

### Task 18: Wire resources and prompts into server

**Files:**

- Modify: `packages/media-server-mcp/src/index.ts`

- [ ] **Step 1: Update server capabilities**

In `createMcpServerWithTools` (or rename to `createMcpServer`), add
`resources: {}` and `prompts: {}` to the capabilities object:

```typescript
const server = new McpServer(
  { name: "media-server-mcp", version: deno.version },
  { capabilities: { tools: {}, resources: {}, prompts: {} } },
);
```

- [ ] **Step 2: Import and call resource registration functions**

Add imports for all resource registration functions and call them in
`setupTools` (or a new `setupResources` function) after tool registration:

```typescript
import { createRadarrResources } from "./resources/radarr-resources.ts";
import { createSonarrResources } from "./resources/sonarr-resources.ts";
import { createTMDBResources } from "./resources/tmdb-resources.ts";
import { createPlexResources } from "./resources/plex-resources.ts";

// In setup function, after tool registration:
if (config.radarrConfig) createRadarrResources(server, config.radarrConfig);
if (config.sonarrConfig) createSonarrResources(server, config.sonarrConfig);
if (config.tmdbConfig) createTMDBResources(server, config.tmdbConfig);
if (config.plexConfig) createPlexResources(server, config.plexConfig);
```

- [ ] **Step 3: Import and call prompt registration functions**

Same pattern for prompts. Note: some prompts depend on multiple services
(e.g., `recommendations` needs TMDB). Only register prompts when their
required services are configured.

```typescript
import { createAddMoviePrompt } from "./prompts/add-movie-prompt.ts";
import { createAddSeriesPrompt } from "./prompts/add-series-prompt.ts";
import { createLibraryReportPrompt } from "./prompts/library-report-prompt.ts";
import { createRecommendationsPrompt } from "./prompts/recommendations-prompt.ts";

// Register prompts based on available services
if (config.radarrConfig) createAddMoviePrompt(server, config.radarrConfig);
if (config.sonarrConfig) createAddSeriesPrompt(server, config.sonarrConfig);
// library-report and recommendations may need multiple configs
```

- [ ] **Step 4: Run full test suite**

```bash
deno check && deno fmt && deno lint
deno test --allow-net --allow-env
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: wire resources and prompts into MCP server"
```

---

### Task 19: SSE deprecation warning

**Files:**

- Modify: `packages/media-server-mcp/src/transports/sse.ts`

- [ ] **Step 1: Add deprecation warning**

At the top of `createSSEServer`, add:

```typescript
logger.warn(
  "SSE transport is deprecated. Use Streamable HTTP (--http) instead. " +
    "SSE will be removed in a future release.",
);
```

- [ ] **Step 2: Run checks**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add deprecation warning for SSE transport"
```

---

### Task 20: Mocked tool execution tests

**Files:**

- Create: `packages/media-server-mcp/tests/tools/radarr-tools-execution_test.ts`
- Create: `packages/media-server-mcp/tests/tools/sonarr-tools-execution_test.ts`
- Create: `packages/media-server-mcp/tests/tools/tmdb-tools-execution_test.ts`
- Create: `packages/media-server-mcp/tests/tools/plex-tools-execution_test.ts`

- [ ] **Step 1: Write radarr execution tests**

Use `@std/testing/mock` to stub the global `fetch`. Create a McpServer,
register radarr tools, then call them via the MCP client protocol. Test 2-3
representative tools:

- `radarr_search_movie`: Happy path (mock 200 response with movie data)
- `radarr_get_movie`: Error path (mock 404 response, verify `isError: true`)
- `radarr_get_movies`: Verify structured output wraps array in object

The test pattern:

1. Stub `fetch` to return a mock response
2. Create McpServer with radarr tools registered
3. Call the tool handler
4. Assert the response shape, `isError` flag, and `structuredContent`

- [ ] **Step 2: Write sonarr execution tests**

Same pattern, 2-3 tools.

- [ ] **Step 3: Write tmdb execution tests**

Same pattern, 2-3 tools.

- [ ] **Step 4: Write plex execution tests**

Same pattern, 2-3 tools.

- [ ] **Step 5: Run all tests**

```bash
deno test --allow-net --allow-env
```

- [ ] **Step 6: Commit**

```bash
git commit -m "test: add mocked tool execution tests for all services"
```

---

### Task 21: Update README and CLAUDE.md

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update README.md**

- Mark SSE mode as deprecated in the transport documentation
- Add a note about MCP resources and prompts being available
- Mention tool annotations

- [ ] **Step 2: Update CLAUDE.md**

Update the following sections:

- **Architecture Overview**: Mention resources and prompts as new primitives
- **Tool Implementation Pattern**: Update to show `wrapToolHandler` usage,
  annotations, and `outputSchema`/`structuredContent`
- **Error Handling Pattern**: Update to mention `isError: true` via wrapper
- **Available Resources by Service**: New section listing all resources
- **Available Prompts**: New section listing all prompts
- **Log Categories**: Already updated in the previous CLAUDE.md commit

- [ ] **Step 3: Run fmt**

```bash
deno fmt
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: update README and CLAUDE.md for MCP improvements"
```

---

### Task 22: Final verification and PR

- [ ] **Step 1: Run complete verification**

```bash
deno check
deno fmt --check
deno lint
deno test --allow-net --allow-env
```

All must pass.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/mcp-improvements
```

- [ ] **Step 3: Create PR**

Create PR targeting `main`. Draft the title and body for user review before
creating. Use the PR template at `.github/pull_request_template.md`.
