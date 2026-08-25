import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/client";
import { createPlexConfig } from "@wyattjoh/plex";
import { createPlexTools } from "../../src/tools/plex-tools.ts";

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
  "plex_refresh_library - happy path returns structuredContent with message",
  async () => {
    // refreshLibrary returns void; Plex client returns {} for empty responses.
    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(null, {
            status: 200,
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_refresh_library",
          arguments: { key: "1" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(typeof structured.message, "string");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_remove_from_collection - happy path returns structuredContent with message",
  async () => {
    // removeFromCollection is a DELETE; Plex returns no body.
    const fetchStub = stub(
      globalThis,
      "fetch",
      () =>
        Promise.resolve(
          new Response(null, {
            status: 200,
          }),
        ),
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_remove_from_collection",
          arguments: { collectionId: "42", ratingKeys: ["100"] },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        assertEquals(typeof structured.message, "string");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_search - happy path returns structuredContent with catchall outputSchema",
  async () => {
    const mockResponse = {
      MediaContainer: {
        size: 1,
        identifier: "com.plexapp.plugins.library",
        Hub: [{
          type: "movie",
          title: "Movies",
          size: 1,
          Metadata: [{
            ratingKey: "12345",
            title: "Inception",
            year: 2010,
            type: "movie",
          }],
        }],
      },
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
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_search",
          arguments: { query: "Inception" },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        const container = structured.MediaContainer as Record<string, unknown>;
        assertExists(container);
        assertEquals(container.size, 1);
        assertEquals(Array.isArray(container.Hub), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_get_capabilities - happy path returns structuredContent with catchall outputSchema",
  async () => {
    const mockResponse = {
      MediaContainer: {
        size: 0,
        machineIdentifier: "abc123",
        version: "1.43.0",
      },
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
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_get_capabilities",
          arguments: {},
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        const container = structured.MediaContainer as Record<string, unknown>;
        assertExists(container);
        assertEquals(container.machineIdentifier, "abc123");
        assertEquals(container.version, "1.43.0");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_get_libraries - happy path returns structuredContent with catchall outputSchema",
  async () => {
    const mockResponse = {
      MediaContainer: {
        size: 2,
        Directory: [
          { key: "1", title: "Movies", type: "movie" },
          { key: "2", title: "TV Shows", type: "show" },
        ],
      },
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
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_get_libraries",
          arguments: {},
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        const container = structured.MediaContainer as Record<string, unknown>;
        assertExists(container);
        assertEquals(container.size, 2);
        assertEquals(Array.isArray(container.Directory), true);
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_get_accounts - returns system account IDs and names",
  async () => {
    let capturedUrl = "";
    const fetchStub = stub(
      globalThis,
      "fetch",
      (url) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                Account: [{
                  id: 42,
                  key: "42",
                  name: "Alice",
                  thumb: "/accounts/42/thumb",
                }],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      },
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_get_accounts",
          arguments: {},
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        const container = structured.MediaContainer as Record<string, unknown>;
        const accounts = container.Account as Array<Record<string, unknown>>;

        assertEquals(new URL(capturedUrl).pathname, "/accounts");
        assertEquals(accounts[0].id, 42);
        assertEquals(accounts[0].name, "Alice");
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_get_playback_history - returns filtered history",
  async () => {
    let capturedUrl = "";
    const fetchStub = stub(
      globalThis,
      "fetch",
      (url) => {
        capturedUrl = url.toString();
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                totalSize: 1,
                offset: 0,
                Metadata: [{
                  historyKey: "/status/sessions/history/1",
                  ratingKey: "123",
                  key: "/library/metadata/123",
                  title: "Inception",
                  type: "movie",
                  viewedAt: 1700000000,
                  accountID: 42,
                  deviceID: 7,
                }],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      },
    );

    try {
      const server = new McpServer({ name: "test", version: "1.0.0" });
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_get_playback_history",
          arguments: {
            ratingKey: "123",
            accountId: 42,
            start: 0,
            size: 25,
          },
        });

        assertExists(result.structuredContent);
        assertEquals(result.isError, undefined);

        const structured = result.structuredContent as Record<string, unknown>;
        const container = structured.MediaContainer as Record<string, unknown>;
        const metadata = container.Metadata as Array<Record<string, unknown>>;
        const requestUrl = new URL(capturedUrl);

        assertEquals(metadata[0].title, "Inception");
        assertEquals(metadata[0].viewedAt, 1700000000);
        assertEquals(requestUrl.pathname, "/status/sessions/history/all");
        assertEquals(requestUrl.searchParams.get("metadataItemID"), "123");
        assertEquals(requestUrl.searchParams.get("accountID"), "42");
        assertEquals(
          requestUrl.searchParams.get("X-Plex-Container-Size"),
          "25",
        );
      } finally {
        await cleanup();
      }
    } finally {
      fetchStub.restore();
    }
  },
);

Deno.test(
  "plex_refresh_library - error path returns isError when Plex returns 500",
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
      const config = createPlexConfig(
        "http://localhost:32400",
        "test-plex-token",
      );
      createPlexTools(server, config, () => true);

      const { client, cleanup } = await createConnectedClient(server);

      try {
        const result = await client.callTool({
          name: "plex_refresh_library",
          arguments: { key: "1" },
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
