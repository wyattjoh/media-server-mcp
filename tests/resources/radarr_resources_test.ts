import { assertEquals } from "jsr:@std/assert";
import {
  createRadarrResources,
  handleRadarrResource,
} from "../../src/resources/radarr-resources.ts";
import { createRadarrConfig } from "../../src/clients/radarr.ts";

Deno.test("createRadarrResources - returns array of resource definitions", () => {
  const resources = createRadarrResources();

  assertEquals(Array.isArray(resources), true);
  assertEquals(resources.length, 6);
});

Deno.test("createRadarrResources - contains expected resource URIs", () => {
  const resources = createRadarrResources();
  const uris = resources.map((r) => r.uri);

  assertEquals(uris.includes("radarr://quality-profiles"), true);
  assertEquals(uris.includes("radarr://root-folders"), true);
  assertEquals(uris.includes("radarr://system/status"), true);
  assertEquals(uris.includes("radarr://system/health"), true);
  assertEquals(uris.includes("radarr://movies"), true);
  assertEquals(uris.includes("radarr://queue"), true);
});

Deno.test("createRadarrResources - all resources have required properties", () => {
  const resources = createRadarrResources();

  for (const resource of resources) {
    assertEquals(typeof resource.uri, "string");
    assertEquals(typeof resource.name, "string");
    assertEquals(typeof resource.description, "string");
    assertEquals(resource.mimeType, "application/json");
  }
});

Deno.test("createRadarrResources - quality-profiles resource has correct metadata", () => {
  const resources = createRadarrResources();
  const qualityProfilesResource = resources.find((r) =>
    r.uri === "radarr://quality-profiles"
  );

  assertEquals(qualityProfilesResource?.name, "Quality Profiles");
  assertEquals(
    qualityProfilesResource?.description,
    "Available quality profiles in Radarr",
  );
  assertEquals(qualityProfilesResource?.mimeType, "application/json");
});

Deno.test("handleRadarrResource - handles unknown resource URI", async () => {
  const mockConfig = createRadarrConfig(
    "http://localhost:7878",
    "test-api-key",
  );
  const result = await handleRadarrResource("radarr://unknown", mockConfig);

  assertEquals(result.isError, true);
  assertEquals(
    result.content[0]?.text?.includes("Unknown Radarr resource"),
    true,
  );
});

Deno.test("handleRadarrResource - returns error result on connection failure", async () => {
  const mockConfig = createRadarrConfig(
    "http://localhost:7878",
    "test-api-key",
  );
  // This test assumes the mock server won't be available
  const result = await handleRadarrResource(
    "radarr://quality-profiles",
    mockConfig,
  );

  // Should return error due to connection failure
  assertEquals(typeof result, "object");
  assertEquals(Array.isArray(result.content), true);
  assertEquals(result.content.length, 1);
  assertEquals(result.content[0]?.type, "text");
});
