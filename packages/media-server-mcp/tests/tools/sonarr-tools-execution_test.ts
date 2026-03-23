import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createSonarrTools } from "../../src/tools/sonarr-tools.ts";

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
  "sonarr_search_series - happy path returns structuredContent with paginated data",
  async () => {
    const mockResults = [
      {
        tvdbId: 153021,
        title: "Breaking Bad",
        year: 2008,
        status: "ended",
        seasons: [],
      },
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
      const config = createSonarrConfig(
        "http://localhost:8989",
        "test-api-key",
      );
      createSonarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "sonarr_search_series",
          arguments: { term: "Breaking Bad" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.total, 1);
        assertEquals(structured.returned, 1);
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
  "sonarr_search_series - error path returns isError when network fails",
  async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      () => Promise.reject(new Error("Network connection refused")),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createSonarrConfig(
        "http://localhost:8989",
        "test-api-key",
      );
      createSonarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "sonarr_search_series",
          arguments: { term: "Breaking Bad" },
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
  "sonarr_get_series_by_id - happy path returns structuredContent with catchall outputSchema",
  async () => {
    const mockSeries = {
      id: 1,
      tvdbId: 153021,
      title: "Breaking Bad",
      year: 2008,
      status: "ended",
      monitored: true,
      seasons: [],
    };

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockSeries), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createSonarrConfig(
        "http://localhost:8989",
        "test-api-key",
      );
      createSonarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "sonarr_get_series_by_id",
          arguments: { id: 1 },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(structured.id, 1);
        assertEquals(structured.tvdbId, 153021);
        assertEquals(structured.title, "Breaking Bad");
        assertEquals(structured.year, 2008);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "sonarr_get_series - happy path returns structuredContent with series list",
  async () => {
    const mockSeries = [
      {
        id: 1,
        tvdbId: 153021,
        title: "Breaking Bad",
        year: 2008,
        status: "ended",
        monitored: true,
        seasons: [],
      },
    ];

    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(JSON.stringify(mockSeries), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createSonarrConfig(
        "http://localhost:8989",
        "test-api-key",
      );
      createSonarrTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "sonarr_get_series",
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
