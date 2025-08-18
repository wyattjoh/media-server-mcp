import { assertEquals } from "jsr:@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTMDBTools } from "../../src/tools/tmdb-tools.ts";
import { createTMDBConfig } from "@wyattjoh/tmdb";

Deno.test("createTMDBTools - registers tools without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createTMDBConfig("test-api-key");

  // Should not throw
  createTMDBTools(server, config, () => true);
});

Deno.test("createTMDBTools - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createTMDBConfig("test-api-key");

  // Should not throw with valid configuration
  createTMDBTools(server, config, () => true);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
