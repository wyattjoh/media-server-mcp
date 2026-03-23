import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
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
