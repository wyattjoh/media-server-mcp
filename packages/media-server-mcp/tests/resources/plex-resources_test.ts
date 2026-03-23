import { assertEquals } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPlexResources } from "../../src/resources/plex-resources.ts";
import { createPlexConfig } from "@wyattjoh/plex";

Deno.test("createPlexResources - registers resources without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createPlexConfig(
    "http://localhost:32400",
    "test-key",
  );

  // Should not throw
  createPlexResources(server, config);
});

Deno.test("createPlexResources - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createPlexConfig(
    "http://localhost:32400",
    "test-key",
  );

  // Should not throw with valid configuration
  createPlexResources(server, config);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
