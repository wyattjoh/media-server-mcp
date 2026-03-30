import { assertEquals } from "@std/assert";
import {
  createRadarrConfig,
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
