import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/client";
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
  "tmdb_find_by_external_id - happy path returns structuredContent with stable result collections",
  async () => {
    const mockResponse = {
      movie_results: [{ id: 550, title: "Fight Club" }],
      tv_results: [],
      person_results: [],
      tv_episode_results: [],
      tv_season_results: [],
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
          name: "tmdb_find_by_external_id",
          arguments: { externalId: "tt0137523" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(Array.isArray(structured.movie_results), true);
        const movies = structured.movie_results as Array<
          Record<string, unknown>
        >;
        assertEquals(movies[0].id, 550);
        assertEquals(movies[0].title, "Fight Club");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "tmdb_get_person_details - accepts an unclassified person",
  async () => {
    const mockResponse = {
      id: 123,
      name: "Unclassified Person",
      known_for_department: null,
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
          name: "tmdb_get_person_details",
          arguments: { personId: 123 },
        });

        assertEquals(result.isError, undefined);
        assertEquals(result.structuredContent, mockResponse);
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
