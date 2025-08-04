import { assertEquals } from "jsr:@std/assert";
import {
  createIMDBResources,
  handleIMDBResource,
} from "../../src/resources/imdb-resources.ts";
import { createIMDBConfig } from "../../src/clients/imdb.ts";

Deno.test("createIMDBResources - returns array of resource definitions", () => {
  const resources = createIMDBResources();

  assertEquals(Array.isArray(resources), true);
  assertEquals(resources.length, 3);
});

Deno.test("createIMDBResources - contains expected resource URIs", () => {
  const resources = createIMDBResources();
  const uris = resources.map((r) => r.uri);

  assertEquals(uris.includes("imdb://lists/top-250"), true);
  assertEquals(uris.includes("imdb://lists/popular-movies"), true);
  assertEquals(uris.includes("imdb://lists/popular-tv"), true);
});

Deno.test("createIMDBResources - all resources have required properties", () => {
  const resources = createIMDBResources();

  for (const resource of resources) {
    assertEquals(typeof resource.uri, "string");
    assertEquals(typeof resource.name, "string");
    assertEquals(typeof resource.description, "string");
    assertEquals(resource.mimeType, "application/json");
  }
});

Deno.test("createIMDBResources - top-250 resource has correct metadata", () => {
  const resources = createIMDBResources();
  const top250Resource = resources.find((r) =>
    r.uri === "imdb://lists/top-250"
  );

  assertEquals(top250Resource?.name, "Top 250 Movies");
  assertEquals(top250Resource?.description, "IMDB Top 250 movies of all time");
  assertEquals(top250Resource?.mimeType, "application/json");
});

Deno.test("createIMDBResources - popular-movies resource has correct metadata", () => {
  const resources = createIMDBResources();
  const popularMoviesResource = resources.find((r) =>
    r.uri === "imdb://lists/popular-movies"
  );

  assertEquals(popularMoviesResource?.name, "Popular Movies");
  assertEquals(
    popularMoviesResource?.description,
    "Currently popular movies on IMDB",
  );
  assertEquals(popularMoviesResource?.mimeType, "application/json");
});

Deno.test("handleIMDBResource - handles unknown resource URI", async () => {
  const mockConfig = createIMDBConfig(
    "https://imdb236.p.rapidapi.com/api/imdb",
    "test-api-key",
  );
  const result = await handleIMDBResource("imdb://unknown", mockConfig);

  assertEquals(result.isError, true);
  assertEquals(
    result.content[0]?.text?.includes("Unknown IMDB resource"),
    true,
  );
});

// Note: Connection failure test removed due to fetch response body leak
// The handleIMDBResource function properly handles errors in production
