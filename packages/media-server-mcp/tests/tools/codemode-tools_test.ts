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
  CODEMODE_LIMITS,
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

Deno.test("codemode initialization teaches the complete safe workflow", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("initialization-secret"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    (client) => {
      const instructions = client.getInstructions();
      assert(instructions !== undefined);
      for (
        const expected of [
          "codemode_search",
          "codemode_describe",
          "codemode_execute",
          "selectedTools",
          "facadePath",
          "async JavaScript function body",
          "explicitly return a JSON value",
          "resources",
          "prompts",
          "read_*",
          "Mutation tools are discoverable but unavailable",
          "filesystem",
          "network",
          "environment",
          "subprocess",
          "FFI",
          "persist",
        ]
      ) {
        assertStringIncludes(instructions, expected);
      }
      const expectedLimits = [
        ["Source", CODEMODE_LIMITS.sourceBytes],
        ["Input", CODEMODE_LIMITS.inputBytes],
        ["Complete execution request", CODEMODE_LIMITS.requestBytes],
        ["Runner protocol frame", CODEMODE_LIMITS.frameBytes],
        ["Native tool calls", CODEMODE_LIMITS.toolCalls],
        ["at most", CODEMODE_LIMITS.concurrentToolCalls],
        ["Native tool result", CODEMODE_LIMITS.toolResultBytes],
        ["across one execution", CODEMODE_LIMITS.totalToolResultBytes],
        ["Final returned result", CODEMODE_LIMITS.finalResultBytes],
        ["Retained diagnostics", CODEMODE_LIMITS.logBytes],
        ["Execution timeout", CODEMODE_LIMITS.executionTimeoutMs],
        ["Global execution concurrency", CODEMODE_LIMITS.concurrentExecutions],
      ] as const;
      for (const [label, limit] of expectedLimits) {
        const formatted = limit.toLocaleString("en-US");
        assert(
          instructions.split("\n").some((line) =>
            line.includes(label) && line.includes(formatted)
          ),
          `Expected ${label} instruction to include ${formatted}`,
        );
      }
      assert(!instructions.includes("initialization-secret"));
      assert(!instructions.includes(Deno.cwd()));
      assert(!instructions.includes("RADARR_API_KEY"));
      return Promise.resolve();
    },
  );
});

Deno.test("native profiles do not receive Code Mode instructions", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: () => true,
      isCodeMode: false,
    },
    (client) => {
      assertEquals(client.getInstructions(), undefined);
      return Promise.resolve();
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

Deno.test("codemode search traverses stable filtered pages without omissions", async () => {
  await withClient(
    {
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      sonarrConfig: createSonarrConfig(
        "http://localhost:8989",
        "test-key",
      ),
      tmdbConfig: createTMDBConfig("test-key"),
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const searchTool = (await client.listTools()).tools.find((tool) =>
        tool.name === "codemode_search"
      );
      assertEquals(
        Object.keys(searchTool?.outputSchema?.properties ?? {}).sort(),
        ["hasMore", "matches", "offset", "returned", "total"],
      );
      assertEquals(
        [...(searchTool?.outputSchema?.required as string[] ?? [])].sort(),
        ["hasMore", "matches", "offset", "returned", "total"],
      );
      assertEquals(
        (searchTool?.inputSchema.properties?.offset as { maximum?: number })
          .maximum,
        10_000,
      );

      const names: string[] = [];
      let offset = 0;
      let total = 0;
      do {
        const response = await client.callTool({
          name: "codemode_search",
          arguments: {
            query: "get",
            services: ["sonarr"],
            policies: ["read-only"],
            limit: 3,
            offset,
          },
        });
        const page = response.structuredContent as {
          matches: Array<{ name: string; service: string; policy: string }>;
          total: number;
          returned: number;
          offset: number;
          hasMore: boolean;
        };
        total = page.total;
        assertEquals(page.offset, offset);
        assertEquals(page.returned, page.matches.length);
        assertEquals(page.hasMore, offset + page.returned < page.total);
        assert(
          page.matches.every((match) =>
            match.service === "sonarr" && match.policy === "read-only"
          ),
        );
        names.push(...page.matches.map((match) => match.name));
        offset += page.returned;
      } while (offset < total);

      assertEquals(names.length, total);
      assertEquals(new Set(names).size, total);

      const repeated = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "get",
          services: ["sonarr"],
          policies: ["read-only"],
          limit: 50,
        },
      });
      assertEquals(
        (repeated.structuredContent as {
          matches: Array<{ name: string }>;
        }).matches.map((match) => match.name),
        names,
      );

      const beyond = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "get",
          services: ["sonarr"],
          policies: ["read-only"],
          offset: total,
        },
      });
      assertEquals(beyond.structuredContent, {
        matches: [],
        total,
        returned: 0,
        offset: total,
        hasMore: false,
      });
    },
  );
});

Deno.test("codemode search rejects negative offsets", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      for (const offset of [-1, 10_001]) {
        const response = await client.callTool({
          name: "codemode_search",
          arguments: { offset },
        });
        assertEquals(response.isError, true);
      }
    },
  );
});

Deno.test("codemode search ranks natural multi-word capability queries", async () => {
  await withClient(
    {
      sonarrConfig: createSonarrConfig(
        "http://localhost:8989",
        "test-key",
      ),
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const seriesResponse = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "  SERIES   episodes search lookup  ",
          policies: ["read-only"],
          limit: 5,
        },
      });
      const seriesResult = seriesResponse.structuredContent as {
        matches: Array<{ name: string }>;
      };
      assertEquals(
        seriesResult.matches[0]?.name,
        "sonarr_get_episodes",
      );

      const plexResponse = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "library search metadata",
          services: ["plex"],
          policies: ["read-only"],
          limit: 5,
        },
      });
      const plexResult = plexResponse.structuredContent as {
        matches: Array<{ name: string }>;
      };
      assertEquals(plexResult.matches[0]?.name, "plex_search");
      assert(
        plexResult.matches.some((match) => match.name === "plex_get_metadata"),
      );
    },
  );
});

Deno.test("codemode search applies ranking tiers with stable catalog-order ties", async () => {
  await withClient(
    {
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      sonarrConfig: createSonarrConfig(
        "http://localhost:8989",
        "test-key",
      ),
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const exactNameResponse = await client.callTool({
        name: "codemode_search",
        arguments: { query: "RADARR_GRAB_RELEASE", limit: 5 },
      });
      const exactNameResult = exactNameResponse.structuredContent as {
        matches: Array<{ name: string }>;
      };
      assertEquals(
        exactNameResult.matches.slice(0, 2).map((match) => match.name),
        ["radarr_grab_release", "radarr_get_releases"],
      );

      const phraseResponse = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "movies on tmdb",
          policies: ["read-only"],
          limit: 5,
        },
      });
      const phraseResult = phraseResponse.structuredContent as {
        matches: Array<{ name: string }>;
      };
      assertEquals(phraseResult.matches[0]?.name, "tmdb_search_movies");

      const tiedResponse = await client.callTool({
        name: "codemode_search",
        arguments: { query: "quality cutoff", limit: 10 },
      });
      const tiedResult = tiedResponse.structuredContent as {
        matches: Array<{ name: string }>;
      };
      assertEquals(
        tiedResult.matches.slice(0, 2).map((match) => match.name),
        ["radarr_get_wanted_cutoff", "sonarr_get_wanted_cutoff"],
      );
    },
  );
});

Deno.test("codemode search filters and bounds empty queries before limiting", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const response = await client.callTool({
        name: "codemode_search",
        arguments: {
          query: "   ",
          services: ["plex"],
          policies: ["read-only"],
          limit: 2,
        },
      });
      const result = response.structuredContent as {
        matches: Array<{ service: string; policy: string }>;
      };
      assertEquals(result.matches.length, 2);
      assert(
        result.matches.every((match) =>
          match.service === "plex" && match.policy === "read-only"
        ),
      );
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
      assertEquals(readOnly.inputSchema.required, ["query"]);
      assertEquals(readOnly.inputSchema.additionalProperties, false);
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
      assertStringIncludes(String(readOnly.signature), "language?: string");

      const serialized = JSON.stringify(result);
      assert(!serialized.includes("tmdb_search_tv"));
      assert(!serialized.includes("radarr_get_movies"));
    },
  );
});

Deno.test("codemode describe publishes useful TMDB output contracts", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const names = [
        "tmdb_search_movies",
        "tmdb_search_tv",
        "tmdb_search_people",
        "tmdb_search_multi",
        "tmdb_get_popular_movies",
        "tmdb_get_movie_details",
        "tmdb_get_tv_details",
        "tmdb_get_person_details",
        "tmdb_get_collection_details",
        "tmdb_find_by_external_id",
      ];
      const response = await client.callTool({
        name: "codemode_describe",
        arguments: { names },
      });
      const result = response.structuredContent as {
        descriptions: Array<{
          name: string;
          outputSchema: Record<string, unknown>;
          signature: string;
        }>;
      };
      const descriptions = new Map(
        result.descriptions.map((
          description,
        ) => [description.name, description]),
      );

      for (
        const name of [
          "tmdb_search_movies",
          "tmdb_search_tv",
          "tmdb_search_people",
          "tmdb_search_multi",
          "tmdb_get_popular_movies",
        ]
      ) {
        const description = descriptions.get(name)!;
        assertStringIncludes(description.signature, "page: number");
        assertStringIncludes(description.signature, "total_pages: number");
        assertStringIncludes(description.signature, "total_results: number");
        assertStringIncludes(description.signature, "results:");
      }

      assertStringIncludes(
        descriptions.get("tmdb_search_movies")!.signature,
        "title: string",
      );
      assertStringIncludes(
        descriptions.get("tmdb_search_tv")!.signature,
        "name: string",
      );
      assertStringIncludes(
        descriptions.get("tmdb_search_people")!.signature,
        "name: string",
      );
      const multi = descriptions.get("tmdb_search_multi")!;
      assertStringIncludes(multi.signature, "media_type: string");
      assertStringIncludes(multi.signature, "title?: string");
      assertStringIncludes(multi.signature, "name?: string");

      for (
        const [name, identityField] of [
          ["tmdb_get_movie_details", "title: string"],
          ["tmdb_get_tv_details", "name: string"],
          ["tmdb_get_person_details", "name: string"],
          ["tmdb_get_collection_details", "parts:"],
        ]
      ) {
        const description = descriptions.get(name)!;
        assertStringIncludes(description.signature, "id: number");
        assertStringIncludes(description.signature, identityField);
        assert(
          description.outputSchema.additionalProperties !== false,
          `${name} should allow compatible additional TMDB fields`,
        );
      }

      const externalId = descriptions.get("tmdb_find_by_external_id")!;
      assertStringIncludes(externalId.signature, "movie_results:");
      assertStringIncludes(externalId.signature, "person_results:");
      assertStringIncludes(externalId.signature, "tv_results:");
      assertStringIncludes(externalId.signature, "id: number");
      assert(externalId.outputSchema.additionalProperties !== false);
    },
  );
});

Deno.test("codemode describe renders dynamic TMDB record contracts", async () => {
  await withClient(
    {
      tmdbConfig: createTMDBConfig("test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const response = await client.callTool({
        name: "codemode_describe",
        arguments: {
          names: ["tmdb_get_watch_providers", "tmdb_get_certifications"],
        },
      });
      const descriptions = (response.structuredContent as {
        descriptions: Array<{ name: string; signature: string }>;
      }).descriptions;
      const byName = new Map(
        descriptions.map((description) => [description.name, description]),
      );

      assertStringIncludes(
        byName.get("tmdb_get_watch_providers")!.signature,
        "results: Record<string,",
      );
      assertStringIncludes(
        byName.get("tmdb_get_watch_providers")!.signature,
        "provider_name: string",
      );
      assertStringIncludes(
        byName.get("tmdb_get_certifications")!.signature,
        "certifications: Record<string,",
      );
      assertStringIncludes(
        byName.get("tmdb_get_certifications")!.signature,
        "certification: string",
      );
    },
  );
});

Deno.test("codemode describe publishes useful Plex output contracts", async () => {
  await withClient(
    {
      plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const names = [
        "plex_get_capabilities",
        "plex_get_libraries",
        "plex_search",
        "plex_get_metadata",
        "plex_get_library_items",
        "plex_get_collections",
        "plex_get_collection_items",
      ];
      const response = await client.callTool({
        name: "codemode_describe",
        arguments: { names },
      });
      const result = response.structuredContent as {
        descriptions: Array<{
          name: string;
          outputSchema: Record<string, unknown>;
          signature: string;
        }>;
      };
      const descriptions = new Map(
        result.descriptions.map((
          description,
        ) => [description.name, description]),
      );

      for (const name of names) {
        const schema = descriptions.get(name)?.outputSchema;
        assert(schema !== undefined);
        assertEquals(schema.required, ["MediaContainer"]);
        assert(
          Object.keys(schema.properties as Record<string, unknown>).length > 0,
        );
      }

      const libraries = descriptions.get("plex_get_libraries");
      assert(libraries !== undefined);
      assertStringIncludes(libraries.signature, "MediaContainer:");
      assertStringIncludes(libraries.signature, "Directory:");
      assertStringIncludes(libraries.signature, "key: string");
      assertStringIncludes(libraries.signature, "type: string");
      assertStringIncludes(libraries.signature, "title: string");
      assertStringIncludes(libraries.signature, "size: number");

      const search = descriptions.get("plex_search");
      assert(search !== undefined);
      assertStringIncludes(search.signature, "Hub:");
      assertStringIncludes(search.signature, "Metadata?:");
      assertStringIncludes(search.signature, "ratingKey: string");
      assertStringIncludes(search.signature, "type: string");
      assertStringIncludes(search.signature, "title: string");
      assertStringIncludes(search.signature, "size: number");

      const searchContainer = (
        search.outputSchema.properties as Record<
          string,
          { properties: Record<string, unknown> }
        >
      ).MediaContainer;
      const hubs = searchContainer.properties.Hub as {
        items: { additionalProperties: unknown };
      };
      assert(hubs.items.additionalProperties !== false);
    },
  );
});

Deno.test("codemode describe publishes useful Arr output contracts", async () => {
  await withClient(
    {
      radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
      sonarrConfig: createSonarrConfig("http://localhost:8989", "test-key"),
      isToolEnabled: codemodeFilter(),
      isCodeMode: true,
    },
    async (client) => {
      const names = [
        "radarr_get_movies",
        "radarr_get_history",
        "sonarr_get_series",
        "sonarr_get_episodes",
        "sonarr_get_history",
        "sonarr_get_series_history",
      ];
      const response = await client.callTool({
        name: "codemode_describe",
        arguments: { names },
      });
      const result = response.structuredContent as {
        descriptions: Array<{
          name: string;
          outputSchema: Record<string, unknown>;
          signature: string;
        }>;
      };
      const descriptions = new Map(
        result.descriptions.map((
          description,
        ) => [description.name, description]),
      );

      const movies = descriptions.get("radarr_get_movies")!;
      assertStringIncludes(movies.signature, "data:");
      assertStringIncludes(movies.signature, "tmdbId: number");
      assertStringIncludes(movies.signature, "title: string");
      assertStringIncludes(movies.signature, "year: number");
      assertStringIncludes(movies.signature, "returned: number");
      assertStringIncludes(movies.signature, "skip: number");
      assertStringIncludes(movies.signature, "limit?: number");

      const radarrHistory = descriptions.get("radarr_get_history")!;
      assertStringIncludes(radarrHistory.signature, "records:");
      assertStringIncludes(radarrHistory.signature, "movieId: number");
      assertStringIncludes(radarrHistory.signature, "eventType: string");
      assertStringIncludes(radarrHistory.signature, "date: string");
      assertStringIncludes(radarrHistory.signature, "movie?:");
      assertStringIncludes(radarrHistory.signature, "returned: number");
      assertStringIncludes(radarrHistory.signature, "includeMovie?: boolean");

      const series = descriptions.get("sonarr_get_series")!;
      assertStringIncludes(series.signature, "tvdbId: number");
      assertStringIncludes(series.signature, "title: string");
      assertStringIncludes(series.signature, "year: number");

      const episodes = descriptions.get("sonarr_get_episodes")!;
      assertStringIncludes(episodes.signature, "seriesId: number");
      assertStringIncludes(episodes.signature, "seasonNumber: number");
      assertStringIncludes(episodes.signature, "episodeNumber: number");
      assertStringIncludes(episodes.signature, "title?: string");

      for (const name of ["sonarr_get_history", "sonarr_get_series_history"]) {
        const history = descriptions.get(name)!;
        assertStringIncludes(history.signature, "eventType: string");
        assertStringIncludes(history.signature, "date: string");
        assertStringIncludes(history.signature, "series?:");
        assertStringIncludes(history.signature, "episode?:");
        assertStringIncludes(history.signature, "includeSeries?: boolean");
        assertStringIncludes(history.signature, "includeEpisode?: boolean");
      }

      const historySchema = radarrHistory.outputSchema as {
        properties: {
          records: { items: { additionalProperties: unknown } };
        };
      };
      assert(
        historySchema.properties.records.items.additionalProperties !== false,
      );
    },
  );
});

Deno.test(
  "native and Code Mode inputs keep defaults optional and reject unknown properties",
  async () => {
    const originalFetch = globalThis.fetch;
    const nativeRequests: string[] = [];
    const oversizedUnknownProperty = "unexpected_".repeat(2_000);
    globalThis.fetch = (input) => {
      const url = String(input);
      nativeRequests.push(url);
      if (url.includes("/api/v3/calendar")) {
        return Promise.resolve(Response.json([]));
      }
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
          sonarrConfig: createSonarrConfig(
            "http://localhost:8989",
            "test-key",
          ),
          isToolEnabled: () => true,
          isCodeMode: false,
        },
        async (client) => {
          const tools = (await client.listTools()).tools;
          const movieTool = tools.find((tool) =>
            tool.name === "tmdb_search_movies"
          );
          const calendarTool = tools.find((tool) =>
            tool.name === "sonarr_get_calendar"
          );
          assertEquals(movieTool?.inputSchema.required, ["query"]);
          assertEquals(movieTool?.inputSchema.additionalProperties, false);
          assertEquals(calendarTool?.inputSchema.required, undefined);
          assertEquals(
            calendarTool?.inputSchema.additionalProperties,
            false,
          );

          const invalid = await client.callTool({
            name: "tmdb_search_movies",
            arguments: {
              query: "Arrival",
              [oversizedUnknownProperty]: "ignored",
            },
          });
          assertEquals(invalid.isError, true);
          assertEquals(nativeRequests, []);
          assertLessOrEqual(JSON.stringify(invalid).length, 1_000);
          assert(!JSON.stringify(invalid).includes("test-key"));

          const invalidNested = await client.callTool({
            name: "sonarr_get_series",
            arguments: {
              filters: { [oversizedUnknownProperty]: "ignored" },
            },
          });
          assertEquals(invalidNested.isError, true);
          assertEquals(nativeRequests, []);
          assertLessOrEqual(JSON.stringify(invalidNested).length, 1_000);
          assert(!JSON.stringify(invalidNested).includes("test-key"));

          const movie = await client.callTool({
            name: "tmdb_search_movies",
            arguments: { query: "Arrival" },
          });
          assertEquals(movie.isError, undefined, JSON.stringify(movie));
          const movieUrl = new URL(nativeRequests[0]);
          assertEquals(movieUrl.searchParams.get("page"), "1");
          assertEquals(movieUrl.searchParams.get("language"), "en-US");

          const calendar = await client.callTool({
            name: "sonarr_get_calendar",
            arguments: {},
          });
          assertEquals(calendar.isError, undefined, JSON.stringify(calendar));
          assertEquals(new URL(nativeRequests[1]).search, "");
        },
      );

      const codeModeRequests: string[] = [];
      globalThis.fetch = (input) => {
        const url = String(input);
        codeModeRequests.push(url);
        if (url.includes("api.themoviedb.org")) {
          return Promise.resolve(Response.json({
            page: 1,
            total_pages: 1,
            total_results: 0,
            results: [],
          }));
        }
        if (url.includes("/api/v3/calendar")) {
          return Promise.resolve(Response.json([]));
        }
        return Promise.resolve(
          new Response("unexpected request", {
            status: 500,
          }),
        );
      };

      await withClient(
        {
          tmdbConfig: createTMDBConfig("test-key"),
          sonarrConfig: createSonarrConfig(
            "http://localhost:8989",
            "test-key",
          ),
          isToolEnabled: codemodeFilter(),
          isCodeMode: true,
        },
        async (client) => {
          const tools = (await client.listTools()).tools;
          const searchTool = tools.find((tool) =>
            tool.name === "codemode_search"
          );
          const executeTool = tools.find((tool) =>
            tool.name === "codemode_execute"
          );
          assertEquals(searchTool?.inputSchema.required, undefined);
          assertEquals(searchTool?.inputSchema.additionalProperties, false);
          assertEquals(executeTool?.inputSchema.required, ["source"]);
          assertEquals(
            executeTool?.inputSchema.additionalProperties,
            false,
          );

          const invalidFacadeInput = await client.callTool({
            name: "codemode_execute",
            arguments: {
              source: "return { executed: true };",
              selectedTools: [],
              [oversizedUnknownProperty]: "ignored",
            },
          });
          assertEquals(invalidFacadeInput.isError, true);
          assertEquals(codeModeRequests, []);
          assertLessOrEqual(JSON.stringify(invalidFacadeInput).length, 1_000);
          assert(!JSON.stringify(invalidFacadeInput).includes("test-key"));

          const invalidNativeInput = await client.callTool({
            name: "codemode_execute",
            arguments: {
              source:
                'return await tools.tmdb.searchMovies({ query: "Arrival", unexpected: "ignored" });',
              selectedTools: ["tmdb_search_movies"],
            },
          });
          assertEquals(invalidNativeInput.isError, true);
          assertEquals(codeModeRequests, []);
          assertLessOrEqual(JSON.stringify(invalidNativeInput).length, 1_000);
          assert(!JSON.stringify(invalidNativeInput).includes("test-key"));

          const describe = await client.callTool({
            name: "codemode_describe",
            arguments: {
              names: ["tmdb_search_movies", "sonarr_get_calendar"],
            },
          });
          const descriptions = (describe.structuredContent as {
            descriptions: Array<{
              name: string;
              inputSchema: Record<string, unknown>;
              signature: string;
            }>;
          }).descriptions;
          const movieDescription = descriptions.find((description) =>
            description.name === "tmdb_search_movies"
          )!;
          const calendarDescription = descriptions.find((description) =>
            description.name === "sonarr_get_calendar"
          )!;
          assertEquals(movieDescription.inputSchema.required, ["query"]);
          assertEquals(
            calendarDescription.inputSchema.required,
            undefined,
          );
          assertEquals(
            movieDescription.inputSchema.additionalProperties,
            false,
          );
          assertStringIncludes(
            movieDescription.signature,
            "language?: string",
          );
          assertStringIncludes(
            calendarDescription.signature,
            "includeSeries?: boolean",
          );

          const result = await client.callTool({
            name: "codemode_execute",
            arguments: {
              source:
                "const [movie, calendar] = await Promise.all([tools.tmdb.searchMovies({ query: 'Arrival' }), tools.sonarr.getCalendar({})]); return { movieResults: movie.total_results, calendarResults: calendar.total };",
              selectedTools: [
                "tmdb_search_movies",
                "sonarr_get_calendar",
              ],
            },
          });
          assertEquals(result.isError, undefined, JSON.stringify(result));
          assertEquals(result.structuredContent, {
            result: { movieResults: 0, calendarResults: 0 },
          });
          const movieRequest = codeModeRequests.find((url) =>
            url.includes("api.themoviedb.org")
          );
          assert(movieRequest !== undefined);
          const movieUrl = new URL(movieRequest);
          assertEquals(movieUrl.searchParams.get("page"), "1");
          assertEquals(movieUrl.searchParams.get("language"), "en-US");
          const calendarRequest = codeModeRequests.find((url) =>
            url.includes("/api/v3/calendar")
          );
          assert(calendarRequest !== undefined);
          assertEquals(new URL(calendarRequest).search, "");
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

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

Deno.test("codemode progressive discovery executes a cross-service projection", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.includes("/api/v3/movie")) {
      return Promise.resolve(Response.json([
        { id: 1, tmdbId: 329865, title: "Arrival", year: 2016 },
        { id: 2, tmdbId: 686, title: "Contact", year: 1997 },
      ]));
    }
    if (url.includes("api.themoviedb.org/3/search/movie")) {
      return Promise.resolve(Response.json({
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [{ id: 329865, title: "Arrival" }],
      }));
    }
    return Promise.resolve(new Response("unexpected request", { status: 500 }));
  };
  try {
    await withClient(
      {
        radarrConfig: createRadarrConfig(
          "http://localhost:7878",
          "test-key",
        ),
        tmdbConfig: createTMDBConfig("test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        const search = await client.callTool({
          name: "codemode_search",
          arguments: {
            query: "movie",
            policies: ["read-only"],
            limit: 50,
          },
        });
        const matches = (search.structuredContent as {
          matches: Array<{ name: string }>;
        }).matches.map(({ name }) => name);
        assert(matches.includes("radarr_get_movies"));
        assert(matches.includes("tmdb_search_movies"));

        const describe = await client.callTool({
          name: "codemode_describe",
          arguments: {
            names: ["radarr_get_movies", "tmdb_search_movies"],
          },
        });
        const descriptions = (describe.structuredContent as {
          descriptions: Array<{ facadePath: string; available: boolean }>;
        }).descriptions;
        assertEquals(
          descriptions.map(({ facadePath }) => facadePath),
          ["tools.radarr.getMovies", "tools.tmdb.searchMovies"],
        );
        assert(descriptions.every(({ available }) => available));

        const execute = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "const [library, search] = await Promise.all([tools.radarr.getMovies({}), tools.tmdb.searchMovies({ query: 'Arrival', language: 'en-US' })]); return { libraryTitles: library.data.map(({ title }) => title), tmdbMatches: search.total_results };",
            selectedTools: ["radarr_get_movies", "tmdb_search_movies"],
          },
        });
        assertEquals(
          execute.isError,
          undefined,
          JSON.stringify(execute.content),
        );
        assertEquals(execute.structuredContent, {
          result: {
            libraryTitles: ["Arrival", "Contact"],
            tmdbMatches: 1,
          },
        });
        assertEquals(execute.content, [{
          type: "text",
          text: '{"libraryTitles":["Arrival","Contact"],"tmdbMatches":1}',
        }]);
        assert(!JSON.stringify(execute).includes("total_pages"));
        assert(!JSON.stringify(execute).includes("329865"));
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

  assertEquals(catalog.length, 105);
  assertEquals(
    new Set(catalog.map((entry) => entry.name)).size,
    catalog.length,
  );
  for (const entry of catalog) {
    assertEquals(entry.available, entry.policy === "read-only");
    assert(entry.facadePath.startsWith(`tools.${entry.service}.`));
    assertEquals(entry.inputSchema.type, "object");
    assertEquals(entry.inputSchema.additionalProperties, false);
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
      MediaContainer: {
        size: 0,
        friendlyName: "Test Plex",
        machineIdentifier: "plex-1",
        version: "1.43.0",
      },
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

Deno.test("codemode execute projects bounded metadata-heavy cross-service results", async () => {
  const originalFetch = globalThis.fetch;
  const representativeItems = (count: number) =>
    Array.from({ length: count }, (_, id) => ({
      id,
      tmdbId: id,
      tvdbId: id,
      year: 2024,
      key: String(id),
      ratingKey: String(id),
      type: "movie",
      title: `Representative title ${id}`,
      summary: "x".repeat(180),
      Media: [{ Part: [{ file: "x".repeat(1_000) }] }],
    }));
  const crossServiceItems = representativeItems(300);
  const plexItems = representativeItems(600);
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.includes("localhost:7878/api/v3/movie")) {
      return Promise.resolve(Response.json(crossServiceItems));
    }
    if (url.includes("localhost:8989/api/v3/series")) {
      return Promise.resolve(Response.json(crossServiceItems));
    }
    if (url.includes("api.themoviedb.org")) {
      return Promise.resolve(Response.json({
        page: 1,
        total_pages: 1,
        total_results: crossServiceItems.length,
        results: crossServiceItems,
      }));
    }
    if (url.includes("/library/sections/")) {
      return Promise.resolve(Response.json({
        MediaContainer: {
          size: plexItems.length,
          identifier: "com.plexapp.plugins.library",
          librarySectionID: 1,
          librarySectionTitle: "Movies",
          librarySectionUUID: "fixture-library",
          Metadata: plexItems,
        },
      }));
    }
    return Promise.resolve(Response.json({
      MediaContainer: {
        size: 1,
        title1: "Plex Library",
        Directory: [{ key: "1", type: "movie", title: "Movies" }],
      },
    }));
  };
  try {
    await withClient(
      {
        radarrConfig: createRadarrConfig("http://localhost:7878", "test-key"),
        sonarrConfig: createSonarrConfig("http://localhost:8989", "test-key"),
        tmdbConfig: createTMDBConfig("test-key"),
        plexConfig: createPlexConfig("http://localhost:32400", "test-key"),
        isToolEnabled: codemodeFilter(),
        isCodeMode: true,
      },
      async (client) => {
        const crossService = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "const [radarr, sonarr, tmdb, plex] = await Promise.all([tools.radarr.getMovies({}), tools.sonarr.getSeries({}), tools.tmdb.searchMovies({ query: 'Arrival' }), tools.plex.getLibraries({})]); return { radarr: radarr.returned, sonarr: sonarr.returned, tmdb: tmdb.total_results, plex: plex.MediaContainer.size };",
            selectedTools: [
              "radarr_get_movies",
              "sonarr_get_series",
              "tmdb_search_movies",
              "plex_get_libraries",
            ],
          },
        });
        assertEquals(crossService.structuredContent, {
          result: { radarr: 300, sonarr: 300, tmdb: 300, plex: 1 },
        });

        const plexProjection = await client.callTool({
          name: "codemode_execute",
          arguments: {
            source:
              "const pages = await Promise.all(['1', '2', '3'].map((key) => tools.plex.getLibraryItems({ key, size: 200 }))); return pages.map((page) => ({ count: page.MediaContainer.size, firstTitle: page.MediaContainer.Metadata[0].title }));",
            selectedTools: ["plex_get_library_items"],
          },
        });
        assertEquals(plexProjection.structuredContent, {
          result: Array.from({ length: 3 }, () => ({
            count: 600,
            firstTitle: "Representative title 0",
          })),
        });
        assert(!JSON.stringify(plexProjection).includes("summary"));
        assert(!JSON.stringify(plexProjection).includes("Media"));
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
          return Promise.resolve({
            payload: "x".repeat(CODEMODE_LIMITS.toolResultBytes),
          });
        },
      ),
    Error,
    "Code Mode native result bytes for tmdb_search_movies exceeds limit",
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
