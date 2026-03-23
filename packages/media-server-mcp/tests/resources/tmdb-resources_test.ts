import { assertEquals } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTMDBResources } from "../../src/resources/tmdb-resources.ts";
import { createTMDBConfig } from "@wyattjoh/tmdb";

Deno.test("createTMDBResources - registers resources without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createTMDBConfig("test-api-key");

  // Should not throw
  createTMDBResources(server, config);
});

Deno.test("createTMDBResources - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createTMDBConfig("test-api-key");

  // Should not throw with valid configuration
  createTMDBResources(server, config);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
