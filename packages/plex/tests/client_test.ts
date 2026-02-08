import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import {
  createPlexConfig,
  getCapabilities,
  getLibraries,
  getMetadata,
  type PlexConfig,
  search,
  SearchType,
  testConnection,
} from "../mod.ts";

function getConfig(): PlexConfig | undefined {
  const url = Deno.env.get("PLEX_URL");
  const apiKey = Deno.env.get("PLEX_API_KEY") ?? Deno.env.get("PLEX_TOKEN");
  if (!url || !apiKey) return undefined;
  return createPlexConfig(url, apiKey);
}

const config = getConfig();
const skip = !config;

Deno.test({
  name: "testConnection - connects successfully",
  ignore: skip,
  fn: async () => {
    const result = await testConnection(config!);
    assertEquals(result.success, true);
    assertEquals(result.error, undefined);
  },
});

Deno.test({
  name: "getCapabilities - returns server info",
  ignore: skip,
  fn: async () => {
    const result = await getCapabilities(config!);
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.version);
    assertExists(result.MediaContainer.machineIdentifier);
  },
});

Deno.test({
  name: "getLibraries - returns library list",
  ignore: skip,
  fn: async () => {
    const result = await getLibraries(config!);
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.Directory);
    assertEquals(Array.isArray(result.MediaContainer.Directory), true);
  },
});

Deno.test({
  name: "search - returns hub search results",
  ignore: skip,
  fn: async () => {
    const result = await search(config!, "*");
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.Hub);
    assertEquals(Array.isArray(result.MediaContainer.Hub), true);
  },
});

Deno.test({
  name: "search - filters by search type",
  ignore: skip,
  fn: async () => {
    const result = await search(config!, "*", 100, [SearchType.TV]);
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.Hub);
    assertEquals(Array.isArray(result.MediaContainer.Hub), true);
  },
});

Deno.test({
  name: "search - respects limit parameter",
  ignore: skip,
  fn: async () => {
    const result = await search(config!, "*", 5);
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.Hub);

    for (const hub of result.MediaContainer.Hub) {
      if (hub.Metadata) {
        assertEquals(hub.Metadata.length <= 5, true);
      }
    }
  },
});

Deno.test({
  name: "search - hubs contain expected fields",
  ignore: skip,
  fn: async () => {
    const result = await search(config!, "*", 10);

    for (const hub of result.MediaContainer.Hub) {
      assertExists(hub.hubIdentifier);
      assertExists(hub.type);
      assertExists(hub.title);
      assertEquals(typeof hub.size, "number");
    }
  },
});

Deno.test({
  name: "search - metadata items contain expected fields",
  ignore: skip,
  fn: async () => {
    const result = await search(config!, "*", 10);

    const hubWithMetadata = result.MediaContainer.Hub.find((h) => h.Metadata);
    if (!hubWithMetadata?.Metadata) return;

    const item = hubWithMetadata.Metadata[0];
    assertExists(item.ratingKey);
    assertExists(item.title);
    assertExists(item.type);
  },
});

Deno.test({
  name: "getMetadata - retrieves item details from search result",
  ignore: skip,
  fn: async () => {
    // Find a ratingKey from search results first
    const searchResult = await search(config!, "*", 1);
    const hub = searchResult.MediaContainer.Hub.find((h) => h.Metadata);
    if (!hub?.Metadata?.[0]) return;

    const ratingKey = hub.Metadata[0].ratingKey;
    const result = await getMetadata(config!, ratingKey);
    assertExists(result.MediaContainer);
    assertExists(result.MediaContainer.Metadata);
    assertEquals(result.MediaContainer.Metadata.length > 0, true);
    assertEquals(result.MediaContainer.Metadata[0].ratingKey, ratingKey);
  },
});
