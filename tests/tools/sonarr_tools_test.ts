import { assertEquals } from "jsr:@std/assert";
import { createSonarrTools } from "../../src/tools/sonarr-tools.ts";

Deno.test("createSonarrTools - returns array of tool definitions", () => {
  const tools = createSonarrTools();

  assertEquals(Array.isArray(tools), true);
  assertEquals(tools.length > 0, true);
});

Deno.test("createSonarrTools - contains expected tool names", () => {
  const tools = createSonarrTools();
  const toolNames = tools.map((tool) => tool.name);

  const expectedTools = [
    "sonarr_search_series",
    "sonarr_add_series",
    "sonarr_get_series",
    "sonarr_get_series_by_id",
    "sonarr_delete_series",
    "sonarr_get_episodes",
    "sonarr_update_episode_monitoring",
    "sonarr_get_calendar",
    "sonarr_get_queue",
    "sonarr_get_quality_profiles",
    "sonarr_get_root_folders",
    "sonarr_refresh_series",
    "sonarr_search_series_episodes",
    "sonarr_search_season",
    "sonarr_get_system_status",
    "sonarr_get_health",
  ];

  for (const expectedTool of expectedTools) {
    assertEquals(
      toolNames.includes(expectedTool),
      true,
      `Missing tool: ${expectedTool}`,
    );
  }
});

Deno.test("createSonarrTools - all tools have required properties", () => {
  const tools = createSonarrTools();

  for (const tool of tools) {
    assertEquals(typeof tool.name, "string");
    assertEquals(typeof tool.description, "string");
    assertEquals(typeof tool.inputSchema, "object");
    assertEquals(tool.name.startsWith("sonarr_"), true);
    assertEquals((tool.description || "").length > 0, true);
  }
});

Deno.test("createSonarrTools - add_series tool has correct required fields", () => {
  const tools = createSonarrTools();
  const addTool = tools.find((tool) => tool.name === "sonarr_add_series");

  assertEquals(addTool !== undefined, true);
  assertEquals(Array.isArray(addTool!.inputSchema.required), true);

  const requiredFields = addTool!.inputSchema.required || [];
  const expectedRequired = [
    "tvdbId",
    "title",
    "qualityProfileId",
    "rootFolderPath",
  ];

  for (const field of expectedRequired) {
    assertEquals(
      requiredFields.includes(field),
      true,
      `Missing required field: ${field}`,
    );
  }
});
