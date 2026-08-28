import { assertEquals, assertExists } from "@std/assert";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createPlexConfig } from "@wyattjoh/plex";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createTMDBConfig } from "@wyattjoh/tmdb";
import deno from "../../deno.json" with { type: "json" };
import { createMcpServerWithTools } from "../../src/server-factory.ts";
import { CODEMODE_LIMITS } from "../../src/tools/codemode-executor.ts";
import { createToolFilter } from "../../src/tools/tool-filter.ts";

Deno.test("runtime identity exposes the active Code Mode contract safely at the MCP boundary", async () => {
  const secrets = {
    radarrUrl: "http://private-radarr.invalid:7878/private-path",
    sonarrUrl: "http://private-sonarr.invalid:8989/private-path",
    plexUrl: "http://private-plex.invalid:32400/private-path",
    apiKey: "sentinel-api-key",
    authToken: "sentinel-auth-token",
  };
  const server = createMcpServerWithTools({
    radarrConfig: createRadarrConfig(secrets.radarrUrl, secrets.apiKey),
    sonarrConfig: createSonarrConfig(secrets.sonarrUrl, secrets.apiKey),
    tmdbConfig: createTMDBConfig(secrets.apiKey),
    plexConfig: createPlexConfig(secrets.plexUrl, secrets.apiKey),
    authToken: secrets.authToken,
    isToolEnabled: createToolFilter({
      profile: "codemode",
      additionalBranches: [],
      excludeTools: [],
      includeTools: [],
    }),
    isCodeMode: true,
  });
  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({
    name: "runtime-resource-test",
    version: "1.0.0",
  });
  await client.connect(clientTransport);

  try {
    const resources = (await client.listResources()).resources;
    assertExists(
      resources.find(({ uri }) =>
        uri === "runtime://media-server-mcp/identity"
      ),
    );

    const result = await client.readResource({
      uri: "runtime://media-server-mcp/identity",
    });
    const content = result.contents[0];
    assertExists(content);
    if (!("text" in content)) throw new Error("Expected textual resource");

    const identity = JSON.parse(content.text);
    assertEquals(identity, {
      server: {
        name: "media-server-mcp",
        version: deno.version,
      },
      codeMode: {
        contractRevision: 1,
        configuredServices: ["radarr", "sonarr", "tmdb", "plex"],
        executionPolicy: "read-only",
        limits: CODEMODE_LIMITS,
      },
    });

    const serialized = JSON.stringify(identity);
    for (
      const forbidden of [
        ...Object.values(secrets),
        Deno.cwd(),
        "RADARR_API_KEY",
        "stderr",
        "stack",
      ]
    ) {
      assertEquals(serialized.includes(forbidden), false, forbidden);
    }
  } finally {
    await client.close();
  }
});

Deno.test("runtime identity is not registered outside Code Mode", async () => {
  const server = createMcpServerWithTools({
    tmdbConfig: createTMDBConfig("sentinel-api-key"),
    isToolEnabled: () => true,
    isCodeMode: false,
  });
  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "native-resource-test", version: "1.0.0" });
  await client.connect(clientTransport);

  try {
    const resourceUris = (await client.listResources()).resources.map((
      { uri },
    ) => uri);
    assertEquals(
      resourceUris.includes("runtime://media-server-mcp/identity"),
      false,
    );
    assertEquals(resourceUris.includes("config://tmdb"), true);
  } finally {
    await client.close();
  }
});
