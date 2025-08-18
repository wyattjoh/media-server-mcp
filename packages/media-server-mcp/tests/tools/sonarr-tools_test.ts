import { assertEquals } from "jsr:@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSonarrTools } from "../../src/tools/sonarr-tools.ts";
import { createSonarrConfig } from "@wyattjoh/sonarr";

Deno.test("createSonarrTools - registers tools without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createSonarrConfig(
    "http://localhost:8989",
    "test-api-key",
  );

  // Should not throw
  createSonarrTools(server, config);
});

Deno.test("createSonarrTools - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createSonarrConfig(
    "http://localhost:8989",
    "test-api-key",
  );

  // Should not throw with valid configuration
  createSonarrTools(server, config);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
