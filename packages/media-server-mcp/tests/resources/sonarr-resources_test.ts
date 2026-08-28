import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createSonarrResources } from "../../src/resources/sonarr-resources.ts";

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

Deno.test("createSonarrResources - registers complete and summary resources", async () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );
  createSonarrResources(
    server,
    createSonarrConfig("http://localhost:8989", "test-key"),
  );

  const { client, cleanup } = await createConnectedClient(server);
  try {
    const resources = (await client.listResources()).resources;
    assertEquals(
      resources.map(({ uri }) => uri).sort(),
      ["config://sonarr", "config://sonarr/summary"],
    );
  } finally {
    await cleanup();
  }
});

Deno.test("sonarr summary projects compact configuration at the MCP boundary", async () => {
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
    formatItems: [{ format: 9, name: "Preferred", score: 100 }],
  }];
  const rootFolders = [{
    id: 2,
    path: "/tv",
    accessible: true,
    freeSpace: 123_456,
    unmappedFolders: Array.from(
      { length: 100 },
      (_, index) => ({
        name: `unmapped-${index}`,
        path: `/tv/unmapped-${index}`,
      }),
    ),
  }];
  const fetchStub = stub(globalThis, "fetch", (input) => {
    const body = String(input).endsWith("/qualityProfile")
      ? qualityProfiles
      : rootFolders;
    return Promise.resolve(Response.json(body));
  });

  try {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    createSonarrResources(
      server,
      createSonarrConfig("http://localhost:8989", "sentinel-secret"),
    );
    const { client, cleanup } = await createConnectedClient(server);
    try {
      const result = await client.readResource({
        uri: "config://sonarr/summary",
      });
      const content = result.contents[0];
      assertExists(content);
      if (!("text" in content)) throw new Error("Expected textual resource");

      assertEquals(JSON.parse(content.text), {
        qualityProfiles: [{ id: 1, name: "HD-1080p" }],
        rootFolders: [{
          id: 2,
          path: "/tv",
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

Deno.test("complete Sonarr configuration resource remains unchanged", async () => {
  const qualityProfiles = [{ id: 1, name: "HD", items: [{ allowed: true }] }];
  const rootFolders = [{
    id: 2,
    path: "/tv",
    accessible: true,
    freeSpace: 100,
    unmappedFolders: [{ name: "extra", path: "/tv/extra" }],
  }];
  const fetchStub = stub(
    globalThis,
    "fetch",
    (input) =>
      Promise.resolve(
        Response.json(
          String(input).endsWith("/qualityProfile")
            ? qualityProfiles
            : rootFolders,
        ),
      ),
  );

  try {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    createSonarrResources(
      server,
      createSonarrConfig("http://localhost:8989", "test-key"),
    );
    const { client, cleanup } = await createConnectedClient(server);
    try {
      const result = await client.readResource({ uri: "config://sonarr" });
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
