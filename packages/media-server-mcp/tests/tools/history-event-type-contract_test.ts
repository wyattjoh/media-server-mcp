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
          // Upstream enum source:
          // https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/History/History.cs
          // Unknown=0, Grabbed=1, deprecated SeriesFolderImported=2,
          // DownloadFolderImported=3, DownloadFailed=4, deprecated inherited
          // EpisodeFileDeleted=5, MovieFileDeleted=6.
          ["grabbed", 1],
          ["downloadFolderImported", 3],
          ["downloadFailed", 4],
          ["movieFileDeleted", 6],
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

Deno.test(
  "history tools preserve stable projections, enrichment, counts, and extra fields",
  async () => {
    const requestedUrls: URL[] = [];
    const fetchStub = stub(
      globalThis,
      "fetch",
      (input: RequestInfo | URL) => {
        const url = new URL(
          input instanceof Request ? input.url : input.toString(),
        );
        requestedUrls.push(url);
        const records = url.port === "7878"
          ? [{
            id: 10,
            movieId: 20,
            eventType: "grabbed",
            date: "2026-08-28T00:00:00Z",
            sourceTitle: "Arrival.2016",
            movie: url.searchParams.get("includeMovie") === "true"
              ? {
                id: 20,
                tmdbId: 329865,
                title: "Arrival",
                year: 2016,
                monitored: true,
              }
              : null,
          }]
          : [{
            id: 30,
            seriesId: 40,
            episodeId: 50,
            eventType: "downloadFolderImported",
            date: "2026-08-28T01:00:00Z",
            sourceTitle: "Severance.S01E01",
            series: url.searchParams.get("includeSeries") === "true"
              ? {
                id: 40,
                tvdbId: 371980,
                title: "Severance",
                year: 2022,
                monitored: true,
              }
              : null,
            episode: url.searchParams.get("includeEpisode") === "true"
              ? {
                id: 50,
                seriesId: 40,
                seasonNumber: 1,
                episodeNumber: 1,
                title: "Good News About Hell",
                hasFile: true,
              }
              : null,
          }];
        return Promise.resolve(Response.json({
          page: 1,
          pageSize: 20,
          totalRecords: 1,
          records,
        }));
      },
    );

    try {
      const cases = [
        {
          name: "radarr_get_history",
          arguments: { includeMovie: true },
          register: (server: McpServer) =>
            createRadarrTools(
              server,
              createRadarrConfig("http://localhost:7878", "test-api-key"),
              () => true,
            ),
        },
        {
          name: "sonarr_get_history",
          arguments: { includeSeries: true, includeEpisode: true },
          register: (server: McpServer) =>
            createSonarrTools(
              server,
              createSonarrConfig("http://localhost:8989", "test-api-key"),
              () => true,
            ),
        },
      ] as const;

      for (const testCase of cases) {
        const server = new McpServer({ name: "test", version: "1.0.0" });
        testCase.register(server);
        const { client, cleanup } = await createConnectedClient(server);
        try {
          const result = await client.callTool({
            name: testCase.name,
            arguments: testCase.arguments,
          });
          assertEquals(result.isError, undefined, JSON.stringify(result));
          const structured = result.structuredContent as {
            totalRecords: number;
            returned: number;
            records: Array<Record<string, unknown>>;
          };
          assertEquals(structured.totalRecords, 1);
          assertEquals(structured.returned, 1);
          assertEquals(structured.records[0].sourceTitle !== undefined, true);
          if (testCase.name === "radarr_get_history") {
            assertEquals(structured.records[0].movie, {
              id: 20,
              tmdbId: 329865,
              title: "Arrival",
              year: 2016,
              monitored: true,
            });
          } else {
            assertEquals(structured.records[0].series, {
              id: 40,
              tvdbId: 371980,
              title: "Severance",
              year: 2022,
              monitored: true,
            });
            assertEquals(structured.records[0].episode, {
              id: 50,
              seriesId: 40,
              seasonNumber: 1,
              episodeNumber: 1,
              title: "Good News About Hell",
              hasFile: true,
            });
          }

          const defaultResult = await client.callTool({
            name: testCase.name,
            arguments: {},
          });
          assertEquals(
            defaultResult.isError,
            undefined,
            JSON.stringify(defaultResult),
          );
          const defaultRecord = (defaultResult.structuredContent as {
            records: Array<Record<string, unknown>>;
          }).records[0];
          if (testCase.name === "radarr_get_history") {
            assertEquals(defaultRecord.movie, null);
          } else {
            assertEquals(defaultRecord.series, null);
            assertEquals(defaultRecord.episode, null);
          }
        } finally {
          await cleanup();
        }
      }

      const radarrRequest = requestedUrls.find((url) => url.port === "7878")!;
      assertEquals(radarrRequest.searchParams.get("includeMovie"), "true");
      const sonarrRequest = requestedUrls.find((url) => url.port === "8989")!;
      assertEquals(sonarrRequest.searchParams.get("includeSeries"), "true");
      assertEquals(sonarrRequest.searchParams.get("includeEpisode"), "true");
    } finally {
      fetchStub.restore();
    }
  },
);
