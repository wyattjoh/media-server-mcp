import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createRadarrTools } from "../../src/tools/radarr-tools.ts";

async function createConnectedClient(
  server: McpServer,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return {
    client,
    cleanup: async () => {
      await client.close();
    },
  };
}

Deno.test(
  "radarr_search_movie - happy path returns structuredContent with paginated data",
  async () => {
    const mockResults = [
      { tmdbId: 550, title: "Fight Club", year: 1999 },
      { tmdbId: 551, title: "Fight Club 2", year: 2022 },
    ];

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockResults), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createRadarrConfig(
        "http://localhost:7878",
        "test-api-key",
      );
      createRadarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "radarr_search_movie",
          arguments: { term: "Fight Club" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.total, 2);
        assertEquals(structured.returned, 2);
        assertEquals(structured.skip, 0);
        assertEquals(Array.isArray(structured.data), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "radarr_search_movie - error path returns isError when fetch fails",
  async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response("Internal Server Error", {
            status: 500,
            statusText: "Internal Server Error",
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createRadarrConfig(
        "http://localhost:7878",
        "test-api-key",
      );
      createRadarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "radarr_search_movie",
          arguments: { term: "Fight Club" },
        });

        assertEquals(result.isError, true);
        assertEquals(Array.isArray(result.content), true);
        const content = result.content as Array<{ type: string; text: string }>;
        assertEquals(content[0].type, "text");
        assertEquals(typeof content[0].text, "string");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "radarr_get_movies - happy path returns structuredContent with movie list",
  async () => {
    const mockMovies = [
      { id: 1, tmdbId: 550, title: "Fight Club", year: 1999, monitored: true },
    ];

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockMovies), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createRadarrConfig(
        "http://localhost:7878",
        "test-api-key",
      );
      createRadarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "radarr_get_movies",
          arguments: {},
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.total, 1);
        assertEquals(Array.isArray(structured.data), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);
