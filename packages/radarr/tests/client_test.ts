import { assertEquals } from "jsr:@std/assert";
import { createRadarrConfig, testConnection } from "../mod.ts";

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
