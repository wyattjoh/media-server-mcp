import { assertEquals } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRadarrResources } from "../../src/resources/radarr-resources.ts";
import { createRadarrConfig } from "@wyattjoh/radarr";

Deno.test("createRadarrResources - registers resources without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createRadarrConfig(
    "http://localhost:7878",
    "test-key",
  );

  // Should not throw
  createRadarrResources(server, config);
});

Deno.test("createRadarrResources - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createRadarrConfig(
    "http://localhost:7878",
    "test-key",
  );

  // Should not throw with valid configuration
  createRadarrResources(server, config);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
