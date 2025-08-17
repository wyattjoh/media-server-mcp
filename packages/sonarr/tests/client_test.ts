import { assertEquals } from "jsr:@std/assert";
import { createSonarrConfig, testConnection } from "../mod.ts";

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
