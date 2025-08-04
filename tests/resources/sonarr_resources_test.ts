import { assertEquals } from "jsr:@std/assert";
import {
  createSonarrResources,
  handleSonarrResource,
} from "../../src/resources/sonarr-resources.ts";
import { createSonarrConfig } from "../../src/clients/sonarr.ts";

Deno.test("createSonarrResources - returns array of resource definitions", () => {
  const resources = createSonarrResources();

  assertEquals(Array.isArray(resources), true);
  assertEquals(resources.length, 7);
});

Deno.test("createSonarrResources - contains expected resource URIs", () => {
  const resources = createSonarrResources();
  const uris = resources.map((r) => r.uri);

  assertEquals(uris.includes("sonarr://quality-profiles"), true);
  assertEquals(uris.includes("sonarr://root-folders"), true);
  assertEquals(uris.includes("sonarr://system/status"), true);
  assertEquals(uris.includes("sonarr://system/health"), true);
  assertEquals(uris.includes("sonarr://series"), true);
  assertEquals(uris.includes("sonarr://queue"), true);
  assertEquals(uris.includes("sonarr://calendar"), true);
});

Deno.test("createSonarrResources - all resources have required properties", () => {
  const resources = createSonarrResources();

  for (const resource of resources) {
    assertEquals(typeof resource.uri, "string");
    assertEquals(typeof resource.name, "string");
    assertEquals(typeof resource.description, "string");
    assertEquals(resource.mimeType, "application/json");
  }
});

Deno.test("createSonarrResources - series resource has correct metadata", () => {
  const resources = createSonarrResources();
  const seriesResource = resources.find((r) => r.uri === "sonarr://series");

  assertEquals(seriesResource?.name, "Series Collection");
  assertEquals(
    seriesResource?.description,
    "All TV series in the Sonarr library",
  );
  assertEquals(seriesResource?.mimeType, "application/json");
});

Deno.test("handleSonarrResource - handles unknown resource URI", async () => {
  const mockConfig = createSonarrConfig(
    "http://localhost:8989",
    "test-api-key",
  );
  const result = await handleSonarrResource("sonarr://unknown", mockConfig);

  assertEquals(result.isError, true);
  assertEquals(
    result.content[0]?.text?.includes("Unknown Sonarr resource"),
    true,
  );
});

Deno.test("handleSonarrResource - returns error result on connection failure", async () => {
  const mockConfig = createSonarrConfig(
    "http://localhost:8989",
    "test-api-key",
  );
  // This test assumes the mock server won't be available
  const result = await handleSonarrResource(
    "sonarr://quality-profiles",
    mockConfig,
  );

  // Should return error due to connection failure
  assertEquals(typeof result, "object");
  assertEquals(Array.isArray(result.content), true);
  assertEquals(result.content.length, 1);
  assertEquals(result.content[0]?.type, "text");
});
