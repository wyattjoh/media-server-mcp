import {
  assertEquals,
  assertExists,
  assertRejects,
} from "jsr:@std/assert@^1.0.0";
import {
  addToCollection,
  createCollection,
  createPlexConfig,
  deleteCollection,
  getCapabilities,
  getCollectionItems,
  getCollections,
  getLibraries,
  getLibraryItems,
  getMetadata,
  type PlexConfig,
  removeFromCollection,
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

// --- Library Items Tests ---

Deno.test({
  name: "getLibraryItems - returns items from first library",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const firstLibrary = libraries.MediaContainer.Directory[0];
    if (!firstLibrary) return;

    const result = await getLibraryItems(config!, firstLibrary.key);
    assertExists(result.MediaContainer);
    assertEquals(typeof result.MediaContainer.size, "number");
  },
});

Deno.test({
  name: "getLibraryItems - supports pagination",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const firstLibrary = libraries.MediaContainer.Directory[0];
    if (!firstLibrary) return;

    const result = await getLibraryItems(config!, firstLibrary.key, {
      start: 0,
      size: 5,
    });
    assertExists(result.MediaContainer);
    if (result.MediaContainer.Metadata) {
      assertEquals(result.MediaContainer.Metadata.length <= 5, true);
    }
  },
});

// --- Collections Tests ---

Deno.test({
  name: "getCollections - returns collections from first library",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const firstLibrary = libraries.MediaContainer.Directory[0];
    if (!firstLibrary) return;

    const result = await getCollections(config!, firstLibrary.key);
    assertExists(result.MediaContainer);
  },
});

// =============================================================================
// Unit tests — no live Plex server required (use fetch mocks)
// =============================================================================

Deno.test("createPlexConfig - stores baseUrl and apiKey", () => {
  const cfg = createPlexConfig("http://plex.local:32400/", "my-token");
  assertEquals(cfg.baseUrl, "http://plex.local:32400"); // trailing slash stripped
  assertEquals(cfg.apiKey, "my-token");
});

Deno.test("createCollection - rejects on empty ratingKeys", async () => {
  const cfg = createPlexConfig("http://localhost:32400", "fake-token");
  await assertRejects(
    () => createCollection(cfg, "1", "Test Collection", []),
    Error,
    "ratingKeys must not be empty",
  );
});

Deno.test("addToCollection - rejects on empty ratingKeys", async () => {
  const cfg = createPlexConfig("http://localhost:32400", "fake-token");
  await assertRejects(
    () => addToCollection(cfg, "58047", []),
    Error,
    "ratingKeys must not be empty",
  );
});

Deno.test(
  "testConnection - returns success and machineIdentifier on 200 response",
  async () => {
    const cfg = createPlexConfig("http://localhost:32400", "fake-token");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            MediaContainer: { machineIdentifier: "abc123def", version: "1.0" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    try {
      const result = await testConnection(cfg);
      assertEquals(result.success, true);
      assertEquals(result.error, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "testConnection - returns failure with error message on non-200 response",
  async () => {
    const cfg = createPlexConfig("http://localhost:32400", "bad-token");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(new Response("Unauthorized", { status: 401 }));

    try {
      const result = await testConnection(cfg);
      assertEquals(result.success, false);
      assertEquals(typeof result.error, "string");
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "addToCollection - GETs collection title then PUTs collection tag on each item",
  async () => {
    const cfg = createPlexConfig("http://localhost:32400", "fake-token");
    const collectionId = "58047";
    const collectionTitle = "My Films";
    const ratingKey = "47066";
    const capturedUrls: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url: string | URL | Request) => {
      const urlStr = url.toString();
      capturedUrls.push(urlStr);
      // First call: GET collection metadata to retrieve title
      if (
        urlStr.includes(`/metadata/${collectionId}`) && !urlStr.includes("?")
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                allowSync: false,
                Metadata: [{
                  ratingKey: collectionId,
                  title: collectionTitle,
                  type: "collection",
                }],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      // Second call: GET item metadata (existing collections)
      if (urlStr.includes(`/metadata/${ratingKey}`) && !urlStr.includes("?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                allowSync: false,
                Metadata: [{
                  ratingKey,
                  title: "A Movie",
                  type: "movie",
                  Collection: [],
                }],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      // Third call: PUT collection tag on item
      return Promise.resolve(
        new Response("", { status: 200, headers: { "content-length": "0" } }),
      );
    };

    try {
      await addToCollection(cfg, collectionId, [ratingKey]);
      // Verify the tag PUT was made to the item with the collection title
      const tagPut = capturedUrls.find(
        (u) =>
          u.includes(`/metadata/${ratingKey}`) && u.includes("collection["),
      );
      assertExists(
        tagPut,
        `Expected a PUT with collection tag, got URLs: ${
          capturedUrls.join(", ")
        }`,
      );
      assertEquals(
        tagPut!.includes(encodeURIComponent(collectionTitle)),
        true,
        `Expected encoded collection title in URL, got: ${tagPut}`,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "createCollection - PUTs collection tags on items then GETs collections to find result",
  async () => {
    const cfg = createPlexConfig("http://localhost:32400", "fake-token");
    const ratingKey = "47066";
    const sectionKey = "1";
    const title = "My Collection";
    const capturedUrls: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url: string | URL | Request) => {
      const urlStr = url.toString();
      capturedUrls.push(urlStr);
      // GET item metadata (existing collections)
      if (
        urlStr.includes(`/metadata/${ratingKey}`) &&
        !urlStr.includes("collection%5B")
      ) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                allowSync: false,
                Metadata: [{
                  ratingKey,
                  title: "A Movie",
                  type: "movie",
                  Collection: [],
                }],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      // GET collections for section (to find created collection by title)
      if (urlStr.includes(`/sections/${sectionKey}/collections`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                size: 1,
                Metadata: [{
                  ratingKey: "99999",
                  title,
                  type: "collection",
                  key: "/k",
                  guid: "g",
                  subtype: "collection",
                  summary: "",
                  index: 0,
                  ratingCount: 0,
                  thumb: "",
                  addedAt: 0,
                  updatedAt: 0,
                  childCount: "1",
                  maxYear: "",
                  minYear: "",
                }],
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      // PUT collection tag on item
      return Promise.resolve(
        new Response("", { status: 200, headers: { "content-length": "0" } }),
      );
    };

    try {
      const result = await createCollection(cfg, sectionKey, title, [
        ratingKey,
      ]);
      // Verify a tag PUT was sent to the item
      const tagPut = capturedUrls.find(
        (u) =>
          u.includes(`/metadata/${ratingKey}`) && u.includes("collection["),
      );
      assertExists(
        tagPut,
        `Expected tag PUT, got URLs: ${capturedUrls.join(", ")}`,
      );
      // Verify the collection was looked up by title
      const colGet = capturedUrls.find((u) =>
        u.includes(`/sections/${sectionKey}/collections`)
      );
      assertExists(colGet, "Expected GET to collections endpoint");
      // Verify the returned collection has the right title
      assertEquals(result.MediaContainer.Metadata![0].title, title);
      assertEquals(result.MediaContainer.Metadata![0].ratingKey, "99999");
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "getCollections - sends X-Plex-Container-Start and X-Plex-Container-Size when options provided",
  async () => {
    const cfg = createPlexConfig("http://localhost:32400", "fake-token");
    let capturedUrl = "";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (url: string | URL | Request) => {
      capturedUrl = url.toString();
      return Promise.resolve(
        new Response(
          JSON.stringify({ MediaContainer: { size: 0 } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    };

    try {
      await getCollections(cfg, "1", { start: 10, size: 5 });
      assertEquals(
        capturedUrl.includes("X-Plex-Container-Start=10"),
        true,
        `Expected X-Plex-Container-Start=10 in URL, got: ${capturedUrl}`,
      );
      assertEquals(
        capturedUrl.includes("X-Plex-Container-Size=5"),
        true,
        `Expected X-Plex-Container-Size=5 in URL, got: ${capturedUrl}`,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

// =============================================================================
// Extended integration tests — require live Plex server
// =============================================================================

Deno.test({
  name: "testConnection - returns success with no error",
  ignore: skip,
  fn: async () => {
    const result = await testConnection(config!);
    assertEquals(result.success, true);
    assertEquals(result.error, undefined);
  },
});

Deno.test({
  name: "getCollections - returns MediaContainer with collection fields",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const library = libraries.MediaContainer.Directory[0];
    if (!library) return;

    const result = await getCollections(config!, library.key);
    assertExists(result.MediaContainer);
    assertEquals(typeof result.MediaContainer.size, "number");
    for (const collection of result.MediaContainer.Metadata ?? []) {
      assertExists(collection.ratingKey);
      assertExists(collection.title);
      assertEquals(collection.type, "collection");
    }
  },
});

Deno.test({
  name: "getCollections - pagination returns non-overlapping pages",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const library = libraries.MediaContainer.Directory[0];
    if (!library) return;

    const page1 = await getCollections(config!, library.key, {
      start: 0,
      size: 5,
    });
    if ((page1.MediaContainer.Metadata?.length ?? 0) < 5) return;

    const page2 = await getCollections(config!, library.key, {
      start: 5,
      size: 5,
    });
    assertExists(page2.MediaContainer);

    const page1Keys = new Set(
      (page1.MediaContainer.Metadata ?? []).map((c) => c.ratingKey),
    );
    for (const c of page2.MediaContainer.Metadata ?? []) {
      assertEquals(
        page1Keys.has(c.ratingKey),
        false,
        `Collection "${c.title}" (${c.ratingKey}) appeared in both pages`,
      );
    }
  },
});

Deno.test({
  name: "getCollectionItems - returns items with expected fields",
  ignore: skip,
  fn: async () => {
    const libraries = await getLibraries(config!);
    const library = libraries.MediaContainer.Directory[0];
    if (!library) return;

    // Find a collection that has items
    const collections = await getCollections(config!, library.key, {
      size: 20,
    });
    const collection = (collections.MediaContainer.Metadata ?? []).find(
      (c) => parseInt(c.childCount) > 0,
    );
    if (!collection) return;

    const result = await getCollectionItems(config!, collection.ratingKey);
    assertExists(result.MediaContainer);
    assertEquals(typeof result.MediaContainer.size, "number");
    for (const item of result.MediaContainer.Metadata ?? []) {
      assertExists(item.ratingKey);
      assertExists(item.title);
      assertExists(item.type);
    }
  },
});

Deno.test({
  name: "collection lifecycle - create, add item, verify, remove item, delete",
  ignore: skip,
  fn: async () => {
    // Discover library and items generically — no hardcoded IDs
    const libraries = await getLibraries(config!);
    const library = libraries.MediaContainer.Directory.find(
      (d) => d.type === "movie" || d.type === "show",
    );
    if (!library) return;

    const items = await getLibraryItems(config!, library.key, {
      start: 0,
      size: 10,
    });
    const metadata = items.MediaContainer.Metadata ?? [];
    if (metadata.length < 2) return;

    const ratingKeyA = metadata[0].ratingKey;
    const ratingKeyB = metadata[1].ratingKey;

    const collectionTitle = `TDD Test ${Date.now()}`;
    let collectionId: string | undefined;

    try {
      // Step 1: Create collection with first item
      const created = await createCollection(
        config!,
        library.key,
        collectionTitle,
        [ratingKeyA],
      );
      assertExists(created.MediaContainer.Metadata);
      collectionId = created.MediaContainer.Metadata![0].ratingKey;
      assertExists(collectionId);
      assertEquals(
        created.MediaContainer.Metadata![0].title,
        collectionTitle,
      );

      // Step 2: Add second item
      await addToCollection(config!, collectionId, [ratingKeyB]);

      // Step 3: Verify second item is present
      const afterAdd = await getCollectionItems(config!, collectionId);
      const afterAddKeys = (afterAdd.MediaContainer.Metadata ?? []).map(
        (m) => m.ratingKey,
      );
      assertEquals(
        afterAddKeys.includes(ratingKeyB),
        true,
        "Item B should be in collection after addToCollection",
      );

      // Step 4: Remove second item
      await removeFromCollection(config!, collectionId, ratingKeyB);

      // Step 5: Verify second item is gone
      const afterRemove = await getCollectionItems(config!, collectionId);
      const afterRemoveKeys = (afterRemove.MediaContainer.Metadata ?? []).map(
        (m) => m.ratingKey,
      );
      assertEquals(
        afterRemoveKeys.includes(ratingKeyB),
        false,
        "Item B should not be in collection after removeFromCollection",
      );
    } finally {
      if (collectionId) {
        await deleteCollection(config!, collectionId);
      }
    }
  },
});
