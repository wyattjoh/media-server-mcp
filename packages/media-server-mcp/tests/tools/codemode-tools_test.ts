import {
  assert,
  assertEquals,
  assertGreater,
  assertLessOrEqual,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createTMDBConfig } from "@wyattjoh/tmdb";
import { createPlexConfig } from "@wyattjoh/plex";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createMcpServerWithTools } from "../../src/server-factory.ts";
import { createCodeModeCatalog } from "../../src/tools/codemode-tools.ts";
import {
  executeCodeMode,
  shutdownCodeModeExecutions,
} from "../../src/tools/codemode-executor.ts";
import {
  createToolFilter,
  getEnabledTools,
  type ToolFilterConfig,
} from "../../src/tools/tool-filter.ts";

const CODEMODE_TOOLS = [
  "codemode_describe",
  "codemode_execute",
  "codemode_search",
];

async function withClient(
  services: Parameters<typeof createMcpServerWithTools>[0],
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const server = createMcpServerWithTools(services);
  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "codemode-test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    await run(client);
  } finally {
    await client.close();
  }
}

function codemodeFilter() {
  return createToolFilter({
    profile: "codemode",
    additionalBranches: [],
    excludeTools: ["tmdb_search_movies"],
    includeTools: ["radarr_get_movies"],
  });
}

Deno.test("existing profiles retain their configured native tool surface", async () => {
  for (
    const profile of [
      "default",
      "minimal",
      "curator",
      "maintainer",
      "power-user",
      "full",
    ]
  ) {
    const config: ToolFilterConfig = {
      profile,
      additionalBranches: [],
      excludeTools: [],
      includeTools: [],
    };
    const services = {
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      tmdbConfig: createTMDBConfig("test-key"),
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      sonarrConfig: createSonarrConfig(
        "http://localhost:8989",
        "test-key",
      ),
    };
    await withClient(
      {
        ...services,
        isToolEnabled: createToolFilter(config),
        isCodeMode: false,
      },
      async (client) => {
        const actual = (await client.listTools()).tools.map((tool) => tool.name)
          .sort();
        const registeredNames = new Set(
          createCodeModeCatalog(services).map((entry) => entry.name),
        );
        const expected = getEnabledTools(config).filter((name) =>
          registeredNames.has(name)
        ).sort();
        assertEquals(actual, expected, profile);
      },
    );
  }
});

Deno.test("codemode profile advertises only facade tools while retaining resources and prompts", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const tools = await client.listTools();
      assertEquals(tools.tools.map((tool) => tool.name).sort(), CODEMODE_TOOLS);
      assertGreater((await client.listResources()).resources.length, 0);
      assertGreater((await client.listPrompts()).prompts.length, 0);
    },
  );
});

Deno.test("codemode search is deterministic, bounded, and scoped to configured services", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const args = { query: "search", services: ["tmdb"], limit: 3 };
      const first = await client.callTool({
        name: "codemode_search",
        arguments: args,
      });
      const second = await client.callTool({
        name: "codemode_search",
        arguments: args,
      });
      assertEquals(first.structuredContent, second.structuredContent);

      const result = first.structuredContent as {
        matches: Array<Record<string, unknown>>;
      };
      assertLessOrEqual(result.matches.length, 3);
      assert(result.matches.length > 0);
      for (const match of result.matches) {
        assertEquals(match.service, "tmdb");
        assertEquals(typeof match.name, "string");
        assertEquals(typeof match.title, "string");
        assertEquals(typeof match.summary, "string");
        assertEquals(typeof match.policy, "string");
        assertEquals(typeof match.available, "boolean");
        assertEquals(typeof match.facadePath, "string");
        assertEquals("inputSchema" in match, false);
      }
    },
  );
});

Deno.test("codemode describe returns exact requested contracts without prior search", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const response = await client.callTool({
        name: "codemode_describe",
        arguments: {
          names: ["radarr_add_movie", "tmdb_search_movies"],
        },
      });
      const result = response.structuredContent as {
        descriptions: Array<
          Record<string, unknown> & {
            inputSchema: Record<string, unknown>;
            outputSchema: Record<string, unknown>;
            annotations: Record<string, unknown>;
          }
        >;
      };

      assertEquals(
        result.descriptions.map((description) => description.name),
        ["radarr_add_movie", "tmdb_search_movies"],
      );
      const mutation = result.descriptions[0];
      assertEquals(mutation.service, "radarr");
      assertEquals(mutation.policy, "mutation");
      assertEquals(mutation.available, false);
      assertEquals(mutation.facadePath, "tools.radarr.addMovie");
      assertEquals(mutation.inputSchema.type, "object");
      assert(
        Object.keys(mutation.inputSchema).includes("properties"),
      );
      assertEquals(mutation.outputSchema.type, "object");
      assertEquals(mutation.annotations, { openWorldHint: false });

      const readOnly = result.descriptions[1];
      assertEquals(readOnly.inputSchema.required, ["query", "language"]);
      assertEquals(
        (readOnly.inputSchema.properties as Record<string, { type: string }>)
          .query.type,
        "string",
      );
      assertEquals(readOnly.outputSchema.required, [
        "page",
        "total_pages",
        "total_results",
        "results",
      ]);
      assertEquals(readOnly.annotations, {
        readOnlyHint: true,
        openWorldHint: false,
      });
      assertEquals(typeof mutation.signature, "string");
      assert(String(mutation.signature).includes("tools.radarr.addMovie"));
      assert(String(mutation.signature).includes("JavaScript"));

      const serialized = JSON.stringify(result);
      assert(!serialized.includes("tmdb_search_tv"));
      assert(!serialized.includes("radarr_get_movies"));
    },
  );
});

Deno.test("codemode describe rejects duplicate and unavailable names deterministically", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      for (
        const names of [
          ["tmdb_search_movies", "tmdb_search_movies"],
          ["radarr_get_movies"],
          ["unknown_tool"],
        ]
      ) {
        const first = await client.callTool({
          name: "codemode_describe",
          arguments: { names },
        });
        const second = await client.callTool({
          name: "codemode_describe",
          arguments: { names },
        });
        assertEquals(first.isError, true);
        assertEquals(first.content, second.content);
        assertLessOrEqual(JSON.stringify(first.content).length, 500);
      }
    },
  );
});

Deno.test("codemode execute returns JSON while isolating console output", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const response = await client.callTool({
        name: "codemode_execute",
        arguments: {
          source:
            'console.log("private diagnostic"); return { total: input.values.reduce((sum, value) => sum + value, 0), toolsFrozen: Object.isFrozen(tools) };',
          input: { values: [2, 3, 5] },
          selectedTools: [],
        },
      });
      assertEquals(response.isError, undefined);
      assertEquals(response.structuredContent, {
        result: { total: 10, toolsFrozen: true },
      });
      assertEquals(response.content, [{
        type: "text",
        text: '{"total":10,"toolsFrozen":true}',
      }]);
      assert(!JSON.stringify(response).includes("private diagnostic"));
    },
  );
});

Deno.test("codemode execute orchestrates one selected read-only tool", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (_input, _init) => {
    requests++;
    return Promise.resolve(Response.json({
      page: 1,
      total_pages: 1,
      total_results: 0,
      results: [],
    }));
  };
  try {
    await withClient(
      {
        tmdbConfig: createTMDBConfig("test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        const response = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              'const response = await tools.tmdb.searchMovies({ query: "Arrival", language: "en-US" }); return { count: response.total_results };',
            selectedTools: ["tmdb_search_movies"],
          },
        });
        assertEquals(response.isError, undefined);
        assertEquals(response.structuredContent, { result: { count: 0 } });
        assertEquals(response.content, [{
          type: "text",
          text: '{"count":0}',
        }]);
        assertEquals(requests, 1);
        assert(!JSON.stringify(response).includes("total_pages"));
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("codemode execute rejects unauthorized and invalid native calls", async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = () => {
    requests++;
    return Promise.resolve(Response.json({}));
  };
  try {
    await withClient(
      {
        tmdbConfig: createTMDBConfig("test-key"),
        radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        for (const selectedTools of [["unknown_tool"], ["radarr_add_movie"]]) {
          const response = await client.callTool({
            name: "codemode_execute",
            arguments: { source: "return null;", selectedTools },
          });
          assertEquals(response.isError, true);
        }

        const invalid = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "await tools.tmdb.searchMovies({ language: 'en-US' }); return null;",
            selectedTools: ["tmdb_search_movies"],
          },
        });
        assertEquals(invalid.isError, true);
        assertEquals(requests, 0);

        const forged = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "let mutationRejected = false; try { Object.defineProperty(tools.tmdb, 'searchTv', { value: () => 'forged' }); } catch { mutationRejected = true; } return { mutationRejected, unselected: typeof tools.tmdb.searchTv, nativeId: typeof tools.tmdb_search_movies };",
            selectedTools: ["tmdb_search_movies"],
          },
        });
        assertEquals(forged.structuredContent, {
          result: {
            mutationRejected: true,
            unselected: "undefined",
            nativeId: "undefined",
          },
        });
        assertEquals(requests, 0);
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("codemode native failures are catchable ToolExecutionError values", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("failure", { status: 500 }));
  try {
    await withClient(
      {
        tmdbConfig: createTMDBConfig("test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        const response = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "try { await tools.tmdb.searchMovies({ query: 'Arrival', language: 'en-US' }); } catch (error) { return { name: error.name, tool: error.tool, message: error.message }; }",
            selectedTools: ["tmdb_search_movies"],
          },
        });
        assertEquals(response.structuredContent, {
          result: {
            name: "ToolExecutionError",
            tool: "tools.tmdb.searchMovies",
            message: "Native tool execution failed",
          },
        });
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("codemode execute uses fresh subprocess state for every call", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      for (let index = 0; index < 2; index++) {
        const response = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "globalThis.invocations = (globalThis.invocations ?? 0) + 1; return globalThis.invocations;",
            selectedTools: [],
          },
        });
        assertEquals(response.structuredContent, { result: 1 });
      }
    },
  );
});

Deno.test("codemode execute returns bounded syntax and serialization errors", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const cases = [
        ["const value: number = 1; return value;", "JavaScript syntax error"],
        ["return 1n;", "Result is not valid JSON"],
        ["return () => 1;", "Result is not valid JSON"],
        [
          "const value = {}; value.self = value; return value;",
          "Result contains a cycle",
        ],
        [
          "let value = {}; let current = value; for (let i = 0; i < 40; i++) { current.next = {}; current = current.next; } return value;",
          "Result exceeds depth limit",
        ],
        ['return "x".repeat(131073);', "Result exceeds byte limit"],
        [
          'const value = {}; value[Symbol("hidden")] = 1; return value;',
          "Result is not valid JSON",
        ],
        [
          "throw new Error('host path must not leak');",
          "JavaScript execution failed",
        ],
      ] as const;
      for (const [source, expected] of cases) {
        const response = await client.callTool({
          name: "codemode_execute",
          arguments: { source, selectedTools: [] },
        });
        assertEquals(response.isError, true);
        const serialized = JSON.stringify(response.content);
        assertStringIncludes(serialized, expected);
        assertLessOrEqual(serialized.length, 300);
        assert(!serialized.includes("codemode-runner.ts"));
        assert(!serialized.includes("host path"));
      }
    },
  );
});

Deno.test("codemode execute kills an infinite-loop subprocess at its deadline", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const startedAt = performance.now();
      const response = await client.callTool({
        name: "codemode_execute",
        arguments: { source: "while (true) {}", selectedTools: [] },
      });
      assertEquals(response.isError, true);
      assertStringIncludes(
        JSON.stringify(response.content),
        "Code Mode execution timed out",
      );
      assertLessOrEqual(performance.now() - startedAt, 5_000);

      const selectedToolResponse = await client.callTool({
        name: "codemode_execute",
        arguments: {
          source: "return null;",
          selectedTools: ["unknown_tool"],
        },
      });
      assertEquals(selectedToolResponse.isError, true);

      const oversizedInputResponse = await client.callTool({
        name: "codemode_execute",
        arguments: {
          source: "return input;",
          input: "x".repeat(256 * 1024),
          selectedTools: [],
        },
      });
      assertEquals(oversizedInputResponse.isError, true);
      assertStringIncludes(
        JSON.stringify(oversizedInputResponse.content),
        "Code Mode request exceeds byte limit",
      );
    },
  );
});

Deno.test("corrupt child protocol is isolated from MCP and another execution", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const [corrupt, healthy] = await Promise.all([
        client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "await Deno.stdout.write(new Uint8Array([0, 0, 0, 0])); return null;",
            selectedTools: [],
          },
        }),
        client.callTool({
          name: "codemode_execute",
          arguments: { source: "return 42;", selectedTools: [] },
        }),
      ]);
      assertEquals(corrupt.isError, true);
      assertStringIncludes(
        JSON.stringify(corrupt.content),
        "Code Mode runner protocol error",
      );
      assertEquals(healthy.structuredContent, { result: 42 });

      const after = await client.callTool({
        name: "codemode_search",
        arguments: { query: "movie" },
      });
      assertEquals(after.isError, undefined);
    },
  );
});

Deno.test("codemode catalog has an explicit reviewed contract for every native tool", () => {
  const services = {
    radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
    sonarrConfig: createSonarrConfig("http://localhost:8989", "test-key"),
    tmdbConfig: createTMDBConfig("test-key"),
    plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
  };
  const catalog = createCodeModeCatalog(services);

  assertEquals(catalog.length, 102);
  assertEquals(
    new Set(catalog.map((entry) => entry.name)).size,
    catalog.length,
  );
  for (const entry of catalog) {
    assertEquals(entry.available, entry.policy === "read-only");
    assert(entry.facadePath.startsWith(`tools.${entry.service}.`));
    assertEquals(entry.inputSchema.type, "object");
    assertEquals(entry.outputSchema.type, "object");
    assertEquals(
      entry.annotations.readOnlyHint === true,
      entry.policy === "read-only",
      `${entry.name} annotations must agree with, but not grant, reviewed policy`,
    );
  }
  assertEquals(
    catalog.find((entry) => entry.name === "radarr_search_movie_releases")
      ?.policy,
    "mutation",
  );
});

Deno.test("codemode execute orchestrates selected tools across services", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.includes("api.themoviedb.org")) {
      return Promise.resolve(Response.json({
        page: 1,
        total_pages: 1,
        total_results: 2,
        results: [],
      }));
    }
    return Promise.resolve(Response.json({
      MediaContainer: { machineIdentifier: "plex-1", version: "1.43.0" },
    }));
  };
  try {
    await withClient(
      {
        tmdbConfig: createTMDBConfig("test-key"),
        plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        const response = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "const movies = await tools.tmdb.searchMovies({ query: 'Arrival', language: 'en-US' }); const plex = await tools.plex.getCapabilities({}); return { movieCount: movies.total_results, plexVersion: plex.MediaContainer.version };",
            selectedTools: ["tmdb_search_movies", "plex_get_capabilities"],
          },
        });
        assertEquals(response.structuredContent, {
          result: { movieCount: 2, plexVersion: "1.43.0" },
        });
        assert(!JSON.stringify(response).includes("machineIdentifier"));
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("codemode executor bounds parallel native calls", async () => {
  let running = 0;
  let maximum = 0;
  const result = await executeCodeMode(
    "return await Promise.all(Array.from({ length: 8 }, () => tools.tmdb.searchMovies({ query: 'Arrival' })));",
    null,
    [{ name: "tmdb_search_movies", facadePath: "tools.tmdb.searchMovies" }],
    async () => {
      running++;
      maximum = Math.max(maximum, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
      return { ok: true };
    },
  );
  assertEquals(result, Array.from({ length: 8 }, () => ({ ok: true })));
  assertLessOrEqual(maximum, 4);
});

Deno.test("codemode executor stops dispatch after a result quota breach", async () => {
  let calls = 0;
  await assertRejects(
    () =>
      executeCodeMode(
        "return await Promise.all(Array.from({ length: 12 }, () => tools.tmdb.searchMovies({ query: 'Arrival' })));",
        null,
        [{
          name: "tmdb_search_movies",
          facadePath: "tools.tmdb.searchMovies",
        }],
        () => {
          calls++;
          return Promise.resolve({ payload: "x".repeat(130 * 1024) });
        },
      ),
    Error,
    "Code Mode tool result bytes exceeds limit",
  );
  assertLessOrEqual(calls, 4);
});

Deno.test("codemode executor handles cancellation and shutdown idempotently", async () => {
  const controller = new AbortController();
  const cancelled = executeCodeMode(
    "while (true) {}",
    null,
    [],
    undefined,
    controller.signal,
  );
  controller.abort();
  await assertRejects(
    () => cancelled,
    Error,
    "Code Mode execution cancelled",
  );

  const active = executeCodeMode("while (true) {}", null);
  const activeRejection = assertRejects(() => active, Error);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await Promise.all([
    shutdownCodeModeExecutions(),
    shutdownCodeModeExecutions(),
  ]);
  await activeRejection;
  assertEquals(await executeCodeMode("return 'clean';", null), "clean");
});

Deno.test("codemode catalog includes mutations as non-executable and ignores native overrides", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const response = await client.callTool({
        name: "codemode_search",
        arguments: { query: "", policies: ["mutation"], limit: 50 },
      });
      const result = response.structuredContent as {
        matches: Array<{ policy: string; available: boolean; name: string }>;
      };
      assert(result.matches.length > 0);
      assert(result.matches.every((match) => match.policy === "mutation"));
      assert(result.matches.every((match) => !match.available));
      assert(result.matches.some((match) => match.name === "radarr_add_movie"));
      assert(
        result.matches.every((match) => !match.name.startsWith("sonarr_")),
      );
    },
  );
});
