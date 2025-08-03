import { assertEquals } from "jsr:@std/assert";
import { createRadarrTools } from "../../src/tools/radarr-tools.ts";

Deno.test("createRadarrTools - returns array of tool definitions", () => {
  const tools = createRadarrTools();

  assertEquals(Array.isArray(tools), true);
  assertEquals(tools.length > 0, true);
});

Deno.test("createRadarrTools - contains expected tool names", () => {
  const tools = createRadarrTools();
  const toolNames = tools.map((tool) => tool.name);

  const expectedTools = [
    "radarr_search_movie",
    "radarr_add_movie",
    "radarr_get_movies",
    "radarr_get_movie",
    "radarr_delete_movie",
    "radarr_get_queue",
    "radarr_get_quality_profiles",
    "radarr_get_root_folders",
    "radarr_refresh_movie",
    "radarr_search_movie_releases",
    "radarr_get_system_status",
    "radarr_get_health",
  ];

  for (const expectedTool of expectedTools) {
    assertEquals(
      toolNames.includes(expectedTool),
      true,
      `Missing tool: ${expectedTool}`,
    );
  }
});

Deno.test("createRadarrTools - all tools have required properties", () => {
  const tools = createRadarrTools();

  for (const tool of tools) {
    assertEquals(typeof tool.name, "string");
    assertEquals(typeof tool.description, "string");
    assertEquals(typeof tool.inputSchema, "object");
    assertEquals(tool.name.startsWith("radarr_"), true);
    assertEquals((tool.description || "").length > 0, true);
  }
});

Deno.test("createRadarrTools - search_movie tool has correct schema", () => {
  const tools = createRadarrTools();
  const searchTool = tools.find((tool) => tool.name === "radarr_search_movie");

  assertEquals(searchTool !== undefined, true);
  assertEquals(searchTool!.inputSchema.type, "object");
  assertEquals(typeof searchTool!.inputSchema.properties, "object");
  assertEquals("term" in (searchTool!.inputSchema.properties || {}), true);
});

Deno.test("createRadarrTools - add_movie tool has correct required fields", () => {
  const tools = createRadarrTools();
  const addTool = tools.find((tool) => tool.name === "radarr_add_movie");

  assertEquals(addTool !== undefined, true);
  assertEquals(Array.isArray(addTool!.inputSchema.required), true);

  const requiredFields = addTool!.inputSchema.required || [];
  const expectedRequired = [
    "tmdbId",
    "title",
    "year",
    "qualityProfileId",
    "rootFolderPath",
    "minimumAvailability",
  ];

  for (const field of expectedRequired) {
    assertEquals(
      requiredFields.includes(field),
      true,
      `Missing required field: ${field}`,
    );
  }
});
