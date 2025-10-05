/**
 * Integration test for environment configuration functionality
 * 
 * This test validates that environment variables are properly configured
 * and must FAIL until the implementation is complete.
 */

import { assertEquals, assertExists } from "jsr:@std/assert";

Deno.test("Integration: Environment variables are loaded correctly", async () => {
  // This test will FAIL until environment configuration is properly implemented
  // We'll test by checking the status endpoint which should show environment variables
  
  const response = await fetch("http://localhost:3000/status");
  assertEquals(response.status, 200);
  
  const statusData = await response.json();
  assertExists(statusData.environment);
  assertEquals(Array.isArray(statusData.environment), true);
  
  // Should have at least some environment variables
  assertEquals(statusData.environment.length > 0, true);
});

Deno.test("Integration: Service environment variables are present", async () => {
  const response = await fetch("http://localhost:3000/status");
  const statusData = await response.json();
  
  const envNames = statusData.environment.map((env: any) => env.name);
  
  // Should include at least one service configuration
  const serviceEnvVars = [
    "RADARR_URL", "RADARR_API_KEY",
    "SONARR_URL", "SONARR_API_KEY", 
    "TMDB_API_KEY",
    "PLEX_URL", "PLEX_API_KEY"
  ];
  
  const hasServiceConfig = serviceEnvVars.some(envVar => envNames.includes(envVar));
  assertEquals(hasServiceConfig, true, "Should have at least one service configured");
});

Deno.test("Integration: Debug mode configuration is respected", async () => {
  const response = await fetch("http://localhost:3000/status");
  const statusData = await response.json();
  
  const envNames = statusData.environment.map((env: any) => env.name);
  
  // Should have DEBUG_MODE or TOOL_PROFILE configuration
  const hasDebugConfig = envNames.includes("DEBUG_MODE") || envNames.includes("TOOL_PROFILE");
  assertEquals(hasDebugConfig, true, "Should have debug/tool configuration");
});

Deno.test("Integration: Sensitive environment variables are marked", async () => {
  const response = await fetch("http://localhost:3000/status");
  const statusData = await response.json();
  
  // Find sensitive environment variables (API keys, tokens)
  const sensitiveEnvs = statusData.environment.filter((env: any) => 
    env.name.includes("API_KEY") || 
    env.name.includes("TOKEN") ||
    env.sensitive === true
  );
  
  // If we have sensitive environment variables, they should be marked as sensitive
  for (const env of sensitiveEnvs) {
    if (env.name.includes("API_KEY") || env.name.includes("TOKEN")) {
      assertEquals(env.sensitive, true, `Environment variable ${env.name} should be marked as sensitive`);
    }
  }
});

Deno.test("Integration: Environment variable values are non-empty when provided", async () => {
  const response = await fetch("http://localhost:3000/status");
  const statusData = await response.json();
  
  // All environment variables should have non-empty values
  for (const env of statusData.environment) {
    assertEquals(typeof env.value, "string");
    assertEquals(env.value.length > 0, true, `Environment variable ${env.name} should have a value`);
  }
});

Deno.test("Integration: Tool profile configuration is valid", async () => {
  const response = await fetch("http://localhost:3000/status");
  const statusData = await response.json();
  
  const toolProfileEnv = statusData.environment.find((env: any) => env.name === "TOOL_PROFILE");
  
  if (toolProfileEnv) {
    const validProfiles = ["default", "curator", "maintainer", "power-user", "full"];
    assertEquals(validProfiles.includes(toolProfileEnv.value), true, 
      `Tool profile ${toolProfileEnv.value} should be one of: ${validProfiles.join(", ")}`);
  }
});
