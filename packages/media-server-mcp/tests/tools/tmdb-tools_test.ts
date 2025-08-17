import { assertEquals } from "jsr:@std/assert";
import { createTMDBTools } from "../../src/tools/tmdb-tools.ts";

Deno.test("createTMDBTools - returns array of tool definitions", () => {
  const tools = createTMDBTools();

  assertEquals(Array.isArray(tools), true);
  assertEquals(tools.length > 0, true);
});

Deno.test("createTMDBTools - contains expected tool names", () => {
  const tools = createTMDBTools();
  const toolNames = tools.map((tool) => tool.name);

  const expectedTools = [
    // Search and discovery tools
    "tmdb_find_by_external_id",
    "tmdb_search_movies",
    "tmdb_search_tv",
    "tmdb_search_multi",
    "tmdb_get_popular_movies",
    "tmdb_discover_movies",
    "tmdb_discover_tv",
    "tmdb_get_genres",
    // Trending content
    "tmdb_get_trending",
    // Movie lists
    "tmdb_get_now_playing_movies",
    "tmdb_get_top_rated_movies",
    "tmdb_get_upcoming_movies",
    // TV lists
    "tmdb_get_popular_tv",
    "tmdb_get_top_rated_tv",
    "tmdb_get_on_the_air_tv",
    "tmdb_get_airing_today_tv",
    // Content details
    "tmdb_get_movie_details",
    "tmdb_get_tv_details",
    // Recommendations
    "tmdb_get_movie_recommendations",
    "tmdb_get_tv_recommendations",
    // Similar content
    "tmdb_get_similar_movies",
    "tmdb_get_similar_tv",
    // People
    "tmdb_search_people",
    "tmdb_get_popular_people",
    "tmdb_get_person_details",
    "tmdb_get_person_movie_credits",
    "tmdb_get_person_tv_credits",
    // Collections and keywords
    "tmdb_search_collections",
    "tmdb_get_collection_details",
    "tmdb_search_keywords",
    "tmdb_get_movies_by_keyword",
    // Certifications and watch providers
    "tmdb_get_certifications",
    "tmdb_get_watch_providers",
    // Configuration
    "tmdb_get_configuration",
    "tmdb_get_countries",
    "tmdb_get_languages",
  ];

  assertEquals(
    toolNames.length,
    expectedTools.length,
    `Expected ${expectedTools.length} tools but got ${toolNames.length}`,
  );

  for (const expectedTool of expectedTools) {
    assertEquals(
      toolNames.includes(expectedTool),
      true,
      `Missing tool: ${expectedTool}`,
    );
  }
});

Deno.test("createTMDBTools - all tools have required properties", () => {
  const tools = createTMDBTools();

  for (const tool of tools) {
    assertEquals(typeof tool.name, "string");
    assertEquals(typeof tool.description, "string");
    assertEquals(typeof tool.inputSchema, "object");
    assertEquals(tool.name.startsWith("tmdb_"), true);
    assertEquals((tool.description || "").length > 0, true);
  }
});

Deno.test("createTMDBTools - search tools have correct schema", () => {
  const tools = createTMDBTools();
  const searchTools = [
    "tmdb_search_movies",
    "tmdb_search_tv",
    "tmdb_search_multi",
    "tmdb_search_people",
    "tmdb_search_collections",
    "tmdb_search_keywords",
  ];

  for (const toolName of searchTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);
    assertEquals(tool!.inputSchema.type, "object");
    assertEquals(typeof tool!.inputSchema.properties, "object");
    assertEquals("query" in (tool!.inputSchema.properties || {}), true);
    assertEquals(Array.isArray(tool!.inputSchema.required), true);
    assertEquals(
      (tool!.inputSchema.required || []).includes("query"),
      true,
      `Tool ${toolName} should require 'query'`,
    );
  }
});

Deno.test("createTMDBTools - find by external ID tool has correct schema", () => {
  const tools = createTMDBTools();
  const tool = tools.find((t) => t.name === "tmdb_find_by_external_id");

  assertEquals(tool !== undefined, true);
  assertEquals(tool!.inputSchema.type, "object");
  assertEquals("externalId" in (tool!.inputSchema.properties || {}), true);
  assertEquals("externalSource" in (tool!.inputSchema.properties || {}), true);
  assertEquals(Array.isArray(tool!.inputSchema.required), true);
  assertEquals(
    (tool!.inputSchema.required || []).includes("externalId"),
    true,
  );
});

Deno.test("createTMDBTools - discover tools have filter properties", () => {
  const tools = createTMDBTools();
  const discoverTools = ["tmdb_discover_movies", "tmdb_discover_tv"];

  for (const toolName of discoverTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);

    const props = tool!.inputSchema.properties || {};
    // Check for common discover properties
    assertEquals("sort_by" in props, true);
    assertEquals("page" in props, true);
    assertEquals("vote_average_gte" in props, true);
    assertEquals("vote_average_lte" in props, true);
    assertEquals("with_genres" in props, true);
  }
});

Deno.test("createTMDBTools - trending tool requires mediaType and timeWindow", () => {
  const tools = createTMDBTools();
  const tool = tools.find((t) => t.name === "tmdb_get_trending");

  assertEquals(tool !== undefined, true);
  assertEquals(Array.isArray(tool!.inputSchema.required), true);
  assertEquals(
    (tool!.inputSchema.required || []).includes("mediaType"),
    true,
  );
  assertEquals(
    (tool!.inputSchema.required || []).includes("timeWindow"),
    true,
  );

  // Check enum values
  const mediaTypeSchema = tool!.inputSchema.properties?.mediaType as {
    enum?: string[];
  };
  assertEquals(Array.isArray(mediaTypeSchema?.enum), true);
  assertEquals(
    mediaTypeSchema?.enum?.includes("all"),
    true,
  );
  assertEquals(
    mediaTypeSchema?.enum?.includes("movie"),
    true,
  );
  assertEquals(
    mediaTypeSchema?.enum?.includes("tv"),
    true,
  );
  assertEquals(
    mediaTypeSchema?.enum?.includes("person"),
    true,
  );
});

Deno.test("createTMDBTools - detail tools require ID parameters", () => {
  const tools = createTMDBTools();
  const detailTools = [
    { name: "tmdb_get_movie_details", param: "movieId" },
    { name: "tmdb_get_tv_details", param: "tvId" },
    { name: "tmdb_get_person_details", param: "personId" },
    { name: "tmdb_get_collection_details", param: "collectionId" },
  ];

  for (const { name, param } of detailTools) {
    const tool = tools.find((t) => t.name === name);
    assertEquals(tool !== undefined, true, `Tool ${name} not found`);
    assertEquals(Array.isArray(tool!.inputSchema.required), true);
    assertEquals(
      (tool!.inputSchema.required || []).includes(param),
      true,
      `Tool ${name} should require '${param}'`,
    );
  }
});

Deno.test("createTMDBTools - recommendation tools require content ID", () => {
  const tools = createTMDBTools();
  const recommendationTools = [
    { name: "tmdb_get_movie_recommendations", param: "movieId" },
    { name: "tmdb_get_tv_recommendations", param: "tvId" },
    { name: "tmdb_get_similar_movies", param: "movieId" },
    { name: "tmdb_get_similar_tv", param: "tvId" },
  ];

  for (const { name, param } of recommendationTools) {
    const tool = tools.find((t) => t.name === name);
    assertEquals(tool !== undefined, true, `Tool ${name} not found`);
    assertEquals(Array.isArray(tool!.inputSchema.required), true);
    assertEquals(
      (tool!.inputSchema.required || []).includes(param),
      true,
      `Tool ${name} should require '${param}'`,
    );
  }
});

Deno.test("createTMDBTools - pagination properties are optional", () => {
  const tools = createTMDBTools();
  const paginatedTools = [
    "tmdb_search_movies",
    "tmdb_search_tv",
    "tmdb_search_multi",
    "tmdb_get_trending",
    "tmdb_get_now_playing_movies",
    "tmdb_get_popular_tv",
  ];

  for (const toolName of paginatedTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);

    const props = tool!.inputSchema.properties || {};
    const required = tool!.inputSchema.required || [];

    // Check pagination properties exist but are not required
    assertEquals("page" in props, true);
    assertEquals("limit" in props, true);
    assertEquals("skip" in props, true);
    assertEquals(required.includes("page"), false);
    assertEquals(required.includes("limit"), false);
    assertEquals(required.includes("skip"), false);
  }
});

Deno.test("createTMDBTools - certifications and watch providers require mediaType", () => {
  const tools = createTMDBTools();
  const toolNames = ["tmdb_get_certifications", "tmdb_get_watch_providers"];

  for (const toolName of toolNames) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);
    assertEquals(Array.isArray(tool!.inputSchema.required), true);
    assertEquals(
      (tool!.inputSchema.required || []).includes("mediaType"),
      true,
      `Tool ${toolName} should require 'mediaType'`,
    );

    // Check enum values
    const mediaTypeSchema = tool!.inputSchema.properties?.mediaType as {
      enum?: string[];
    };
    assertEquals(Array.isArray(mediaTypeSchema?.enum), true);
    assertEquals(mediaTypeSchema?.enum?.includes("movie"), true);
    assertEquals(mediaTypeSchema?.enum?.includes("tv"), true);
  }
});

Deno.test("createTMDBTools - person credit tools require personId", () => {
  const tools = createTMDBTools();
  const creditTools = [
    "tmdb_get_person_movie_credits",
    "tmdb_get_person_tv_credits",
  ];

  for (const toolName of creditTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);
    assertEquals(Array.isArray(tool!.inputSchema.required), true);
    assertEquals(
      (tool!.inputSchema.required || []).includes("personId"),
      true,
      `Tool ${toolName} should require 'personId'`,
    );
  }
});

Deno.test("createTMDBTools - configuration tools have no required parameters", () => {
  const tools = createTMDBTools();
  const configTools = [
    "tmdb_get_configuration",
    "tmdb_get_languages",
  ];

  for (const toolName of configTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);
    // These tools should have no required parameters
    assertEquals(
      Array.isArray(tool!.inputSchema.required),
      false,
      `Tool ${toolName} should have no required parameters`,
    );
  }
});

Deno.test("createTMDBTools - tools with language support have optional language param", () => {
  const tools = createTMDBTools();
  const languageTools = [
    "tmdb_search_movies",
    "tmdb_search_tv",
    "tmdb_get_movie_details",
    "tmdb_get_tv_details",
    "tmdb_get_countries",
  ];

  for (const toolName of languageTools) {
    const tool = tools.find((t) => t.name === toolName);
    assertEquals(tool !== undefined, true, `Tool ${toolName} not found`);

    const props = tool!.inputSchema.properties || {};
    const required = tool!.inputSchema.required || [];

    assertEquals(
      "language" in props,
      true,
      `Tool ${toolName} should have language property`,
    );
    assertEquals(
      required.includes("language"),
      false,
      `Tool ${toolName} language should be optional`,
    );
  }
});
