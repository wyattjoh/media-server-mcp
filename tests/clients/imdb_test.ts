import { assertEquals } from "jsr:@std/assert";
import { createIMDBConfig, testConnection } from "../../src/clients/imdb.ts";

Deno.test("createIMDBConfig - creates valid config", () => {
  const config = createIMDBConfig(
    "https://imdb-api.example.com",
    "test-rapidapi-key",
  );

  assertEquals(config.baseUrl, "https://imdb-api.example.com");
  assertEquals(config.apiKey, "test-rapidapi-key");
});

Deno.test("testConnection - handles network errors gracefully", async () => {
  const config = createIMDBConfig("https://invalid-url-12345.com", "test-key");

  const result = await testConnection(config);
  assertEquals(result.success, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("testConnection - handles successful connection", async () => {
  const config = createIMDBConfig("https://imdb-api.example.com", "test-key");

  // Mock successful response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const result = await testConnection(config);
    assertEquals(result.success, true);
    assertEquals(result.error, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
