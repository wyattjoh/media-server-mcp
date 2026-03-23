import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTMDBConfig } from "@wyattjoh/tmdb";
import { createTMDBTools } from "../../src/tools/tmdb-tools.ts";

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
  "tmdb_search_movies - happy path returns paginated structuredContent",
  async () => {
    const mockResponse = {
      page: 1,
      total_pages: 5,
      total_results: 100,
      results: [
        { id: 550, title: "Fight Club", release_date: "1999-10-15" },
        { id: 551, title: "Fight Club Extended", release_date: "2000-01-01" },
      ],
    };

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createTMDBConfig("test-api-key");
      createTMDBTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "tmdb_search_movies",
          arguments: { query: "Fight Club" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.page, 1);
        assertEquals(structured.total_pages, 5);
        assertEquals(structured.total_results, 100);
        assertEquals(Array.isArray(structured.results), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "tmdb_search_tv - happy path returns paginated TV show structuredContent",
  async () => {
    const mockResponse = {
      page: 1,
      total_pages: 3,
      total_results: 60,
      results: [
        { id: 1396, name: "Breaking Bad", first_air_date: "2008-01-20" },
      ],
    };

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createTMDBConfig("test-api-key");
      createTMDBTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "tmdb_search_tv",
          arguments: { query: "Breaking Bad" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.page, 1);
        assertEquals(structured.total_pages, 3);
        assertEquals(structured.total_results, 60);
        assertEquals(Array.isArray(structured.results), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "tmdb_search_movies - error path returns isError when fetch returns 401",
  async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status_code: 7,
              status_message: "Invalid API key",
            }),
            {
              status: 401,
              statusText: "Unauthorized",
            },
          ),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createTMDBConfig("invalid-api-key");
      createTMDBTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "tmdb_search_movies",
          arguments: { query: "Fight Club" },
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
