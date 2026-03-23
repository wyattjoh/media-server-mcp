import { assertEquals } from "jsr:@std/assert@^1.0.0";

Deno.test("Streamable HTTP transport module - can be imported without errors", async () => {
  const { createStreamableHTTPServer } = await import(
    "../src/transports/streamable-http.ts"
  );
  assertEquals(typeof createStreamableHTTPServer, "function");
});

Deno.test("Shared transport module - can be imported without errors", async () => {
  const mod = await import("../src/transports/shared.ts");
  assertEquals(typeof mod.readBody, "function");
  assertEquals(typeof mod.setCorsHeaders, "function");
  assertEquals(typeof mod.closeTransportServer, "function");
});
