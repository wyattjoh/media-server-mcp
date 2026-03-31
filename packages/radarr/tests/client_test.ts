import { assertEquals } from "@std/assert";
import {
  createRadarrConfig,
  getCalendar,
  getHistory,
  getReleases,
  getWantedCutoff,
  getWantedMissing,
  testConnection,
} from "../mod.ts";

Deno.test("createRadarrConfig - creates valid config", () => {
  const config = createRadarrConfig("http://localhost:7878", "test-api-key");

  assertEquals(config.baseUrl, "http://localhost:7878");
  assertEquals(config.apiKey, "test-api-key");
});

Deno.test("testConnection - handles network errors gracefully", async () => {
  const config = createRadarrConfig("http://invalid-url-12345", "test-key");

  const result = await testConnection(config);
  assertEquals(result.success, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("testConnection - handles successful connection", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");

  // Mock successful response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ version: "4.0.0" }), {
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

Deno.test("getWantedMissing - returns paginated missing movies", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 20,
          sortKey: "title",
          sortDirection: "ascending",
          totalRecords: 1,
          records: [{
            id: 1,
            title: "Test Movie",
            tmdbId: 123,
            year: 2024,
            hasFile: false,
            monitored: true,
            status: "released",
            path: "/movies/test",
            qualityProfileId: 1,
            minimumAvailability: "released",
            isAvailable: true,
            runtime: 120,
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
    assertEquals(result.records[0].title, "Test Movie");
    assertEquals(result.records[0].hasFile, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getWantedCutoff - returns paginated cutoff unmet movies", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 20,
          sortKey: "title",
          sortDirection: "ascending",
          totalRecords: 1,
          records: [{
            id: 2,
            title: "Cutoff Movie",
            tmdbId: 456,
            year: 2023,
            hasFile: true,
            monitored: true,
            status: "released",
            path: "/movies/cutoff",
            qualityProfileId: 1,
            minimumAvailability: "released",
            isAvailable: true,
            runtime: 90,
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };

  try {
    const result = await getWantedCutoff(config);
    assertEquals(result.totalRecords, 1);
    assertEquals(result.records.length, 1);
    assertEquals(result.records[0].title, "Cutoff Movie");
    assertEquals(result.records[0].hasFile, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getHistory - returns paginated history records", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");

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
            movieId: 10,
            sourceTitle: "Test.Movie.2024",
            date: "2024-01-01",
            eventType: "grabbed",
            languages: [],
            quality: {
              quality: {
                id: 1,
                name: "Bluray-1080p",
                source: "bluray",
                resolution: 1080,
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

Deno.test("getReleases - returns releases for a movie", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            guid: "abc-123",
            title: "Test.Movie.2024.1080p",
            size: 5000000000,
            indexerId: 1,
            indexer: "TestIndexer",
            quality: {
              quality: {
                id: 7,
                name: "Bluray-1080p",
                source: "bluray",
                resolution: 1080,
              },
              revision: { version: 1, real: 0, isRepack: false },
            },
            customFormats: [],
            customFormatScore: 0,
            qualityWeight: 0,
            age: 5,
            ageHours: 120,
            ageMinutes: 7200,
            sceneSource: false,
            movieTitles: ["Test Movie"],
            languages: [{ id: 1, name: "English" }],
            approved: true,
            temporarilyRejected: false,
            rejected: false,
            rejections: [],
            publishDate: "2024-01-01",
            downloadAllowed: true,
            releaseWeight: 0,
            seeders: 50,
            leechers: 10,
            protocol: "torrent",
            indexerFlags: 0,
            movieId: 1,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };
  try {
    const result = await getReleases(config, 1);
    assertEquals(result.length, 1);
    assertEquals(result[0].guid, "abc-123");
    assertEquals(result[0].approved, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getCalendar - returns upcoming movies", async () => {
  const config = createRadarrConfig("http://localhost:7878", "test-key");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            id: 1,
            title: "Upcoming Movie",
            year: 2024,
            tmdbId: 456,
            hasFile: false,
            status: "announced",
            path: "/movies/upcoming",
            qualityProfileId: 1,
            monitored: true,
            minimumAvailability: "released",
            isAvailable: false,
            runtime: 90,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  };
  try {
    const result = await getCalendar(config, "2024-01-01", "2024-12-31");
    assertEquals(result.length, 1);
    assertEquals(result[0].title, "Upcoming Movie");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("testConnection - handles HTTP errors", async () => {
  const config = createRadarrConfig("http://localhost:7878", "invalid-key");

  // Mock error response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    return Promise.resolve(new Response("Unauthorized", { status: 401 }));
  };

  try {
    const result = await testConnection(config);
    assertEquals(result.success, false);
    assertEquals(typeof result.error, "string");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
