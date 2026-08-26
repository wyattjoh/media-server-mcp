import {
  assert,
  assertEquals,
  assertGreater,
  assertLessOrEqual,
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
