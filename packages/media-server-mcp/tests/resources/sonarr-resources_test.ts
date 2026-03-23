import { assertEquals } from "@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSonarrResources } from "../../src/resources/sonarr-resources.ts";
import { createSonarrConfig } from "@wyattjoh/sonarr";

Deno.test("createSonarrResources - registers resources without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createSonarrConfig(
    "http://localhost:8989",
    "test-key",
  );

  // Should not throw
  createSonarrResources(server, config);
});

Deno.test("createSonarrResources - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { resources: {} } },
  );

  const config = createSonarrConfig(
    "http://localhost:8989",
    "test-key",
  );

  // Should not throw with valid configuration
  createSonarrResources(server, config);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
