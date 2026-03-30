import { assertEquals } from "@std/assert";
import {
  createSonarrConfig,
  getHistory,
  getReleases,
  getWantedMissing,
  testConnection,
} from "../mod.ts";

Deno.test("createSonarrConfig - creates valid config", () => {
  const config = createSonarrConfig("http://localhost:8989", "test-api-key");

  assertEquals(config.baseUrl, "http://localhost:8989");
  assertEquals(config.apiKey, "test-api-key");
});

Deno.test("testConnection - handles network errors gracefully", async () => {
  const config = createSonarrConfig("http://invalid-url-12345", "test-key");

  const result = await testConnection(config);
  assertEquals(result.success, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("getWantedMissing - returns paginated missing episodes", async () => {
  const config = createSonarrConfig("http://localhost:8989", "test-key");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 20,
          sortKey: "airDateUtc",
          sortDirection: "descending",
          totalRecords: 1,
          records: [{
            id: 1,
            seriesId: 5,
            seasonNumber: 1,
            episodeNumber: 3,
            title: "Test Episode",
            hasFile: false,
            monitored: true,
            unverifiedSceneNumbering: false,
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };

  try {
    const result = await getWantedMissing(config);
    assertEquals(result.totalRecords, 1);
    assertEquals(result.records.length, 1);
    assertEquals(result.records[0].hasFile, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("testConnection - handles successful connection", async () => {
  const config = createSonarrConfig("http://localhost:8989", "test-key");

  // Mock successful response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ version: "3.0.0" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  try {
    const result = await testConnection(config);
    assertEquals(result.success, true);
    assertEquals(result.error, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getReleases - returns releases for an episode", async () => {
  const config = createSonarrConfig("http://localhost:8989", "test-key");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            guid: "xyz-789",
            title: "Test.Show.S01E03.720p",
            size: 1500000000,
            indexerId: 1,
            indexer: "TestIndexer",
            quality: {
              quality: {
                id: 4,
                name: "HDTV-720p",
                source: "television",
                resolution: 720,
              },
              revision: { version: 1, real: 0, isRepack: false },
            },
            customFormats: [],
            customFormatScore: 0,
            qualityWeight: 0,
            age: 2,
            ageHours: 48,
            ageMinutes: 2880,
            fullSeason: false,
            sceneSource: true,
            seasonNumber: 1,
            languages: [{ id: 1, name: "English" }],
            approved: true,
            temporarilyRejected: false,
            rejected: false,
            rejections: [],
            publishDate: "2024-01-01",
            downloadAllowed: true,
            releaseWeight: 0,
            seeders: 100,
            leechers: 5,
            protocol: "torrent",
            indexerFlags: 0,
            episodeId: 3,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };
  try {
    const result = await getReleases(config, 3);
    assertEquals(result.length, 1);
    assertEquals(result[0].guid, "xyz-789");
    assertEquals(result[0].approved, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getHistory - returns paginated history records", async () => {
  const config = createSonarrConfig("http://localhost:8989", "test-key");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 20,
          sortKey: "date",
          sortDirection: "descending",
          totalRecords: 1,
          records: [{
            id: 1,
            episodeId: 5,
            seriesId: 2,
            sourceTitle: "Test.Show.S01E03",
            date: "2024-01-01",
            eventType: "grabbed",
            languages: [],
            quality: {
              quality: {
                id: 1,
                name: "HDTV-720p",
                source: "television",
                resolution: 720,
              },
              revision: { version: 1, real: 0, isRepack: false },
            },
            customFormats: [],
            qualityCutoffNotMet: false,
            data: {},
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };
  try {
    const result = await getHistory(config);
    assertEquals(result.totalRecords, 1);
    assertEquals(result.records[0].eventType, "grabbed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
