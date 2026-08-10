import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createRadarrTools } from "../../src/tools/radarr-tools.ts";
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
  "paginated history tools translate documented event names to API identifiers",
  async () => {
    const requestedUrls: URL[] = [];
    const fetchStub = stub(
      globalThis,
      "fetch",
      (input: RequestInfo | URL) => {
        requestedUrls.push(
          new URL(input instanceof Request ? input.url : input.toString()),
        );
        return Promise.resolve(
          new Response(
            JSON.stringify({
              page: 1,
              pageSize: 20,
              totalRecords: 0,
              records: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      },
    );

    const tools = [
      {
        name: "radarr_get_history",
        eventTypes: [
          ["grabbed", 1],
          ["downloadFolderImported", 3],
          ["downloadFailed", 4],
          ["movieFileDeleted", 5],
        ],
        register: (server: McpServer) =>
          createRadarrTools(
            server,
            createRadarrConfig("http://localhost:7878", "test-api-key"),
            () => true,
          ),
      },
      {
        name: "sonarr_get_history",
        eventTypes: [
          ["grabbed", 1],
          ["downloadFolderImported", 3],
          ["downloadFailed", 4],
          ["episodeFileDeleted", 5],
        ],
        register: (server: McpServer) =>
          createSonarrTools(
            server,
            createSonarrConfig("http://localhost:8989", "test-api-key"),
            () => true,
          ),
      },
    ] as const;

    try {
      for (const tool of tools) {
        const server = new McpServer({ name: "test", version: "1.0.0" });
        tool.register(server);
        const { client, cleanup } = await createConnectedClient(server);

        try {
          for (const [eventType, eventTypeId] of tool.eventTypes) {
            const result = await client.callTool({
              name: tool.name,
              arguments: { eventType },
            });

            assertEquals(result.isError, undefined);
            assertEquals(
              requestedUrls.at(-1)?.searchParams.get("eventType"),
              eventTypeId.toString(),
              `${tool.name} should send ${eventType} as ${eventTypeId}`,
            );
          }

          const unfilteredResult = await client.callTool({
            name: tool.name,
            arguments: {},
          });
          assertEquals(unfilteredResult.isError, undefined);
          assertEquals(
            requestedUrls.at(-1)?.searchParams.has("eventType"),
            false,
            `${tool.name} should omit eventType when no filter is requested`,
          );

          const requestCount = requestedUrls.length;
          const invalidResult = await client.callTool({
            name: tool.name,
            arguments: { eventType: "unsupported" },
          });
          assertEquals(invalidResult.isError, true);
          assertEquals(
            JSON.stringify(invalidResult.content).includes("grabbed"),
            true,
            `${tool.name} should explain which event types are supported`,
          );
          assertEquals(
            requestedUrls.length,
            requestCount,
            `${tool.name} should reject unsupported event types before the API request`,
          );
        } finally {
          await cleanup();
        }
      }
    } finally {
      fetchStub.restore();
    }
  },
);
