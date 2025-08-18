import { assertEquals } from "jsr:@std/assert";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRadarrTools } from "../../src/tools/radarr-tools.ts";
import { createRadarrConfig } from "@wyattjoh/radarr";

Deno.test("createRadarrTools - registers tools without errors", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createRadarrConfig(
    "http://localhost:7878",
    "test-api-key",
  );

  // Should not throw
  createRadarrTools(server, config, () => true);
});

Deno.test("createRadarrTools - works with valid configuration", () => {
  const server = new McpServer(
    { name: "test", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  const config = createRadarrConfig(
    "http://localhost:7878",
    "test-api-key",
  );

  // Should not throw with valid configuration
  createRadarrTools(server, config, () => true);

  // Test passes if no error is thrown
  assertEquals(true, true);
});
