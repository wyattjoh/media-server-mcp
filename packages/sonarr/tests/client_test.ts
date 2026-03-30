import { assertEquals } from "@std/assert";
import {
  createSonarrConfig,
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
