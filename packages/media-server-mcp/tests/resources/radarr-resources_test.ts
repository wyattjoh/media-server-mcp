import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createRadarrResources } from "../../src/resources/radarr-resources.ts";

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
    cleanup: () => client.close(),
  };
}

Deno.test("createRadarrResources - registers complete and summary resources", async () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );
  const config = createRadarrConfig(
    "http://localhost:7878",
    "test-key",
  );
  createRadarrResources(server, config);

  const { client, cleanup } = await createConnectedClient(server);
  try {
    const resources = (await client.listResources()).resources;
    assertEquals(
      resources.map(({ uri }) => uri).sort(),
      ["config://radarr", "config://radarr/summary"],
    );
  } finally {
    await cleanup();
  }
});

Deno.test("radarr summary projects compact configuration at the MCP boundary", async () => {
  const qualityProfiles = [{
    id: 1,
    name: "HD-1080p",
    upgradeAllowed: true,
    cutoff: 7,
    items: [{
      id: 7,
      name: "Bluray-1080p",
      allowed: true,
      quality: {
        id: 7,
        name: "Bluray-1080p",
        source: "bluray",
        resolution: 1080,
      },
    }],
    minFormatScore: 0,
    cutoffFormatScore: 0,
    formatItems: [{
      format: {
        id: 9,
        name: "Preferred",
        includeCustomFormatWhenRenaming: false,
        specifications: [],
      },
      score: 100,
    }],
    language: { id: 1, name: "English" },
  }];
  const rootFolders = [{
    id: 2,
    path: "/movies",
    accessible: true,
    freeSpace: 123_456,
    unmappedFolders: Array.from(
      { length: 100 },
      (_, index) => ({
        name: `unmapped-${index}`,
        path: `/movies/unmapped-${index}`,
      }),
    ),
  }];
  const fetchStub = stub(globalThis, "fetch", (input) => {
    const url = String(input);
    const body = url.endsWith("/qualityProfile")
      ? qualityProfiles
      : rootFolders;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  try {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    createRadarrResources(
      server,
      createRadarrConfig("http://localhost:7878", "sentinel-secret"),
    );
    const { client, cleanup } = await createConnectedClient(server);

    try {
      const result = await client.readResource({
        uri: "config://radarr/summary",
      });
      const content = result.contents[0];
      assertExists(content);
      assertEquals("text" in content, true);
      if (!("text" in content)) throw new Error("Expected textual resource");

      const summary = JSON.parse(content.text);
      assertEquals(summary, {
        qualityProfiles: [{ id: 1, name: "HD-1080p" }],
        rootFolders: [{
          id: 2,
          path: "/movies",
          accessible: true,
          freeSpace: 123_456,
        }],
      });
      assertEquals(content.text.includes("items"), false);
      assertEquals(content.text.includes("formatItems"), false);
      assertEquals(content.text.includes("unmappedFolders"), false);
      assertEquals(content.text.includes("sentinel-secret"), false);
    } finally {
      await cleanup();
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("complete Radarr configuration resource remains unchanged", async () => {
  const qualityProfiles = [{ id: 1, name: "HD", items: [{ allowed: true }] }];
  const rootFolders = [{
    id: 2,
    path: "/movies",
    accessible: true,
    freeSpace: 100,
    unmappedFolders: [{ name: "extra", path: "/movies/extra" }],
  }];
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(input).endsWith("/qualityProfile")
              ? qualityProfiles
              : rootFolders,
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
  );

  try {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    createRadarrResources(
      server,
      createRadarrConfig("http://localhost:7878", "test-key"),
    );
    const { client, cleanup } = await createConnectedClient(server);
    try {
      const result = await client.readResource({ uri: "config://radarr" });
      const content = result.contents[0];
      assertExists(content);
      if (!("text" in content)) throw new Error("Expected textual resource");
      assertEquals(JSON.parse(content.text), { qualityProfiles, rootFolders });
    } finally {
      await cleanup();
    }
  } finally {
    fetchStub.restore();
  }
});
