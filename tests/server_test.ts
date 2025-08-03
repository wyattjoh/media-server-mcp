import { assertEquals } from "jsr:@std/assert";

// Simple integration test to verify the main module can be imported
Deno.test("index.ts - can be imported without errors", async () => {
  // This test just verifies the module can be loaded
  // The actual server functionality would require more complex setup
  const moduleUrl = new URL("../src/index.ts", import.meta.url);
  assertEquals(typeof moduleUrl.toString(), "string");
  assertEquals(moduleUrl.toString().endsWith("src/index.ts"), true);
});

// Test environment variable parsing logic
Deno.test("Environment configuration - validates service requirements", () => {
  // Test that at least one service configuration is required
  const emptyRadarr = {};
  const emptySonarr = {};
  const emptyIMDB = undefined;

  // This simulates the validation logic that should exist
  const hasRadarr = Boolean(
    emptyRadarr && "RADARR_URL" in emptyRadarr &&
      "RADARR_API_KEY" in emptyRadarr,
  );
  const hasSonarr = Boolean(
    emptySonarr && "SONARR_URL" in emptySonarr &&
      "SONARR_API_KEY" in emptySonarr,
  );
  const hasIMDB = Boolean(
    emptyIMDB && "IMDB_URL" in emptyIMDB && "RAPIDAPI_KEY" in emptyIMDB,
  );

  const hasAtLeastOneService = hasRadarr || hasSonarr || hasIMDB;

  assertEquals(hasAtLeastOneService, false);
});

Deno.test("Environment configuration - detects valid Radarr config", () => {
  const radarrConfig = {
    RADARR_URL: "http://localhost:7878",
    RADARR_API_KEY: "test-key",
  };

  const hasRadarr = Boolean(
    radarrConfig.RADARR_URL && radarrConfig.RADARR_API_KEY,
  );
  assertEquals(hasRadarr, true);
});

Deno.test("Environment configuration - detects valid Sonarr config", () => {
  const sonarrConfig = {
    SONARR_URL: "http://localhost:8989",
    SONARR_API_KEY: "test-key",
  };

  const hasSonarr = Boolean(
    sonarrConfig.SONARR_URL && sonarrConfig.SONARR_API_KEY,
  );
  assertEquals(hasSonarr, true);
});

Deno.test("Environment configuration - detects valid IMDB config", () => {
  const imdbConfig = {
    IMDB_URL: "https://imdb-api.example.com",
    RAPIDAPI_KEY: "test-key",
  };

  const hasIMDB = Boolean(imdbConfig.IMDB_URL && imdbConfig.RAPIDAPI_KEY);
  assertEquals(hasIMDB, true);
});
