import { assertEquals } from "jsr:@std/assert";
import { createIMDBTools } from "../../src/tools/imdb-tools.ts";

Deno.test("createIMDBTools - returns array of tool definitions", () => {
  const tools = createIMDBTools();

  assertEquals(Array.isArray(tools), true);
  assertEquals(tools.length > 0, true);
});

Deno.test("createIMDBTools - contains expected tool names", () => {
  const tools = createIMDBTools();
  const toolNames = tools.map((tool) => tool.name);

  const expectedTools = [
    "imdb_search",
    "imdb_get_details",
    "imdb_get_cast",
  ];

  for (const expectedTool of expectedTools) {
    assertEquals(
      toolNames.includes(expectedTool),
      true,
      `Missing tool: ${expectedTool}`,
    );
  }
});

Deno.test("createIMDBTools - all tools have required properties", () => {
  const tools = createIMDBTools();

  for (const tool of tools) {
    assertEquals(typeof tool.name, "string");
    assertEquals(typeof tool.description, "string");
    assertEquals(typeof tool.inputSchema, "object");
    assertEquals(tool.name.startsWith("imdb_"), true);
    assertEquals((tool.description || "").length > 0, true);
  }
});

Deno.test("createIMDBTools - search tool has correct schema", () => {
  const tools = createIMDBTools();
  const searchTool = tools.find((tool) => tool.name === "imdb_search");

  assertEquals(searchTool !== undefined, true);
  assertEquals(searchTool!.inputSchema.type, "object");
  assertEquals(typeof searchTool!.inputSchema.properties, "object");
  assertEquals("query" in (searchTool!.inputSchema.properties || {}), true);
  assertEquals(Array.isArray(searchTool!.inputSchema.required), true);
  assertEquals(
    (searchTool!.inputSchema.required || []).includes("query"),
    true,
  );
});

Deno.test("createIMDBTools - get_details tool requires imdbId", () => {
  const tools = createIMDBTools();
  const detailsTool = tools.find((tool) => tool.name === "imdb_get_details");

  assertEquals(detailsTool !== undefined, true);
  assertEquals(Array.isArray(detailsTool!.inputSchema.required), true);
  assertEquals(
    (detailsTool!.inputSchema.required || []).includes("imdbId"),
    true,
  );
});
