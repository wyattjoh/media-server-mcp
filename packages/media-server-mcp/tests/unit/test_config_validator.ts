/**
 * Unit tests for config validator
 * 
 * Tests environment variable validation, service configuration validation,
 * and Docker-specific configuration validation.
 */

import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { createConfigValidator, type ConfigValidator } from "../../src/docker/config-validator.ts";
import type { EnvironmentConfiguration, EnvironmentVariable } from "../../src/types/docker-types.ts";

// Test data
const validEnvironmentConfig: EnvironmentConfiguration = {
  radarrUrl: "http://localhost:7878",
  radarrApiKey: "radarr-api-key",
  sonarrUrl: "http://localhost:8989",
  sonarrApiKey: "sonarr-api-key",
  tmdbApiKey: "tmdb-api-key",
  plexUrl: "http://localhost:32400",
  plexApiKey: "plex-api-key",
  mcpAuthToken: "auth-token",
  toolProfile: "default",
  debugMode: true
};

const validEnvironmentVariable: EnvironmentVariable = {
  name: "RADARR_URL",
  value: "http://localhost:7878",
  sensitive: false
};

Deno.test("Config validator - create with default options", () => {
  const validator = createConfigValidator();
  
  assertExists(validator);
  assertEquals(typeof validator.validateServiceConfig, "function");
  assertEquals(typeof validator.validateEnvironmentConfig, "function");
  assertEquals(typeof validator.validateEnvironmentVariable, "function");
  assertEquals(typeof validator.extractEnvironmentConfig, "function");
  assertEquals(typeof validator.getDockerEnvironmentVariables, "function");
});

Deno.test("Config validator - create with custom options", () => {
  const validator = createConfigValidator({
    requiredServices: ["radarr", "sonarr"],
    strictMode: true
  });
  
  assertExists(validator);
  assertEquals(typeof validator.validateEnvironmentConfig, "function");
});

Deno.test("Config validator - validate service config with valid data", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    "http://localhost:7878",
    "radarr-api-key"
  );
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Config validator - validate service config with invalid URL", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    "invalid-url",
    "radarr-api-key"
  );
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("URL is invalid"));
});

Deno.test("Config validator - validate service config with invalid API key", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    "http://localhost:7878",
    ""
  );
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("API key is invalid"));
});

Deno.test("Config validator - validate service config with URL but no API key", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    "http://localhost:7878",
    undefined
  );
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("URL provided but API key is missing"));
});

Deno.test("Config validator - validate service config with API key but no URL", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    undefined,
    "radarr-api-key"
  );
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("API key provided but URL is missing"));
});

Deno.test("Config validator - validate service config with HTTPS URL", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateServiceConfig(
    "Radarr",
    "https://radarr.example.com",
    "radarr-api-key"
  );
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Config validator - validate environment variable with valid data", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateEnvironmentVariable(validEnvironmentVariable);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Config validator - validate environment variable with invalid name", () => {
  const validator = createConfigValidator();
  
  const invalidEnvVar: EnvironmentVariable = {
    name: "",
    value: "test-value",
    sensitive: false
  };
  
  const validation = validator.validateEnvironmentVariable(invalidEnvVar);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assertEquals(validation.errors[0], "Environment variable name is required");
});

Deno.test("Config validator - validate environment variable with invalid name format", () => {
  const validator = createConfigValidator();
  
  const invalidEnvVar: EnvironmentVariable = {
    name: "invalid-name-format",
    value: "test-value",
    sensitive: false
  };
  
  const validation = validator.validateEnvironmentVariable(invalidEnvVar);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Invalid environment variable name"));
});

Deno.test("Config validator - validate environment variable with non-string value", () => {
  const validator = createConfigValidator();
  
  const invalidEnvVar: EnvironmentVariable = {
    name: "TEST_VAR",
    value: 123 as unknown as string,
    sensitive: false
  };
  
  const validation = validator.validateEnvironmentVariable(invalidEnvVar);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("must be a string"));
});

Deno.test("Config validator - validate environment variable with empty sensitive value", () => {
  const validator = createConfigValidator();
  
  const invalidEnvVar: EnvironmentVariable = {
    name: "API_KEY",
    value: "",
    sensitive: true
  };
  
  const validation = validator.validateEnvironmentVariable(invalidEnvVar);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Sensitive environment variable cannot be empty"));
});

Deno.test("Config validator - validate all environment variables with valid data", () => {
  const validator = createConfigValidator();
  
  const envVars: EnvironmentVariable[] = [
    {
      name: "RADARR_URL",
      value: "http://localhost:7878",
      sensitive: false
    },
    {
      name: "RADARR_API_KEY",
      value: "radarr-key",
      sensitive: true
    }
  ];
  
  const validation = validator.validateAllEnvironmentVariables(envVars);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("Config validator - validate all environment variables with duplicates", () => {
  const validator = createConfigValidator();
  
  const envVars: EnvironmentVariable[] = [
    {
      name: "DUPLICATE_VAR",
      value: "value1",
      sensitive: false
    },
    {
      name: "DUPLICATE_VAR",
      value: "value2",
      sensitive: false
    }
  ];
  
  const validation = validator.validateAllEnvironmentVariables(envVars);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Duplicate environment variable name"));
});

Deno.test("Config validator - validate environment config with valid data", () => {
  const validator = createConfigValidator();
  
  const validation = validator.validateEnvironmentConfig(validEnvironmentConfig);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
  assertEquals(validation.warnings.length, 0);
});

Deno.test("Config validator - validate environment config with no services (strict mode)", () => {
  const validator = createConfigValidator({ strictMode: true });
  
  const emptyConfig: EnvironmentConfiguration = {
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(emptyConfig);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("At least one service must be configured"));
});

Deno.test("Config validator - validate environment config with no services (non-strict mode)", () => {
  const validator = createConfigValidator({ strictMode: false });
  
  const emptyConfig: EnvironmentConfiguration = {
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(emptyConfig);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
  assertEquals(validation.warnings.length, 1);
  assert(validation.warnings[0].includes("No services configured"));
});

Deno.test("Config validator - validate environment config with invalid debug mode", () => {
  const validator = createConfigValidator();
  
  const invalidConfig: EnvironmentConfiguration = {
    debugMode: "true" as unknown as boolean
  };
  
  const validation = validator.validateEnvironmentConfig(invalidConfig);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("Debug mode must be a boolean value"));
});

Deno.test("Config validator - validate environment config with invalid tool profile", () => {
  const validator = createConfigValidator();
  
  const invalidConfig: EnvironmentConfiguration = {
    toolProfile: "invalid-profile",
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(invalidConfig);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
  assertEquals(validation.warnings.length, 1);
  assert(validation.warnings[0].includes("Unknown tool profile"));
});

Deno.test("Config validator - validate environment config with partial Radarr config", () => {
  const validator = createConfigValidator();
  
  const partialConfig: EnvironmentConfiguration = {
    radarrUrl: "http://localhost:7878",
    // Missing radarrApiKey
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(partialConfig);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("URL provided but API key is missing"));
});

Deno.test("Config validator - validate environment config with partial Sonarr config", () => {
  const validator = createConfigValidator();
  
  const partialConfig: EnvironmentConfiguration = {
    sonarrApiKey: "sonarr-key",
    // Missing sonarrUrl
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(partialConfig);
  
  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length, 1);
  assert(validation.errors[0].includes("API key provided but URL is missing"));
});

Deno.test("Config validator - validate environment config with TMDB only", () => {
  const validator = createConfigValidator();
  
  const tmdbOnlyConfig: EnvironmentConfiguration = {
    tmdbApiKey: "tmdb-key",
    debugMode: false
  };
  
  const validation = validator.validateEnvironmentConfig(tmdbOnlyConfig);
  
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
  assertEquals(validation.warnings.length, 0);
});

Deno.test("Config validator - extract environment config", () => {
  const validator = createConfigValidator();
  
  // Mock environment variables
  const originalEnv = Deno.env.get("RADARR_URL");
  Deno.env.set("RADARR_URL", "http://localhost:7878");
  Deno.env.set("RADARR_API_KEY", "radarr-key");
  Deno.env.set("DEBUG_MODE", "true");
  
  try {
    const config = validator.extractEnvironmentConfig();
    
    assertEquals(config.radarrUrl, "http://localhost:7878");
    assertEquals(config.radarrApiKey, "radarr-key");
    assertEquals(config.debugMode, true);
  } finally {
    // Restore environment
    if (originalEnv) {
      Deno.env.set("RADARR_URL", originalEnv);
    } else {
      Deno.env.delete("RADARR_URL");
    }
    Deno.env.delete("RADARR_API_KEY");
    Deno.env.delete("DEBUG_MODE");
  }
});

Deno.test("Config validator - get Docker environment variables", () => {
  const validator = createConfigValidator();
  
  // Mock environment variables
  const originalEnv = Deno.env.get("RADARR_URL");
  Deno.env.set("RADARR_URL", "http://localhost:7878");
  Deno.env.set("RADARR_API_KEY", "radarr-key");
  Deno.env.set("DEBUG_MODE", "true");
  
  try {
    const envVars = validator.getDockerEnvironmentVariables();
    
    assert(envVars.length > 0);
    
    const radarrUrl = envVars.find(env => env.name === "RADARR_URL");
    assertExists(radarrUrl);
    assertEquals(radarrUrl.value, "http://localhost:7878");
    assertEquals(radarrUrl.sensitive, false);
    
    const radarrKey = envVars.find(env => env.name === "RADARR_API_KEY");
    assertExists(radarrKey);
    assertEquals(radarrKey.value, "radarr-key");
    assertEquals(radarrKey.sensitive, true);
  } finally {
    // Restore environment
    if (originalEnv) {
      Deno.env.set("RADARR_URL", originalEnv);
    } else {
      Deno.env.delete("RADARR_URL");
    }
    Deno.env.delete("RADARR_API_KEY");
    Deno.env.delete("DEBUG_MODE");
  }
});

Deno.test("Config validator - validate Docker config", () => {
  const validator = createConfigValidator();
  
  // Mock environment variables
  const originalHostname = Deno.env.get("HOSTNAME");
  Deno.env.set("HOSTNAME", "test-container");
  Deno.env.set("PORT", "3000");
  
  try {
    const validation = validator.validateDockerConfig();
    
    // The validation will depend on the actual filesystem state
    assertExists(validation);
    assertEquals(typeof validation.valid, "boolean");
    assertEquals(Array.isArray(validation.errors), true);
    assertEquals(Array.isArray(validation.warnings), true);
  } finally {
    // Restore environment
    if (originalHostname) {
      Deno.env.set("HOSTNAME", originalHostname);
    } else {
      Deno.env.delete("HOSTNAME");
    }
    Deno.env.delete("PORT");
  }
});

Deno.test("Config validator - validate Docker config with invalid port", () => {
  const validator = createConfigValidator();
  
  // Mock invalid port
  const originalPort = Deno.env.get("PORT");
  Deno.env.set("PORT", "invalid-port");
  
  try {
    const validation = validator.validateDockerConfig();
    
    assertEquals(validation.valid, false);
    assert(validation.errors.some(error => error.includes("Invalid port number")));
  } finally {
    // Restore environment
    if (originalPort) {
      Deno.env.set("PORT", originalPort);
    } else {
      Deno.env.delete("PORT");
    }
  }
});

Deno.test("Config validator - get configuration summary", () => {
  const validator = createConfigValidator();
  
  // Mock environment variables
  const originalEnv = Deno.env.get("RADARR_URL");
  Deno.env.set("RADARR_URL", "http://localhost:7878");
  Deno.env.set("RADARR_API_KEY", "radarr-key");
  Deno.env.set("TMDB_API_KEY", "tmdb-key");
  
  try {
    const summary = validator.getConfigurationSummary();
    
    assertEquals(summary.servicesConfigured.length, 2);
    assert(summary.servicesConfigured.includes("Radarr"));
    assert(summary.servicesConfigured.includes("TMDB"));
    assertEquals(summary.totalEnvironmentVariables, 3);
    assertEquals(summary.sensitiveVariables, 2);
    assertEquals(summary.validationErrors, 0);
    assertEquals(summary.validationWarnings, 0);
  } finally {
    // Restore environment
    if (originalEnv) {
      Deno.env.set("RADARR_URL", originalEnv);
    } else {
      Deno.env.delete("RADARR_URL");
    }
    Deno.env.delete("RADARR_API_KEY");
    Deno.env.delete("TMDB_API_KEY");
  }
});

Deno.test("Config validator - validate environment variable name formats", () => {
  const validator = createConfigValidator();
  
  const validNames = ["RADARR_URL", "API_KEY", "_PRIVATE_VAR", "VAR123"];
  const invalidNames = ["invalid-name", "123INVALID", "invalid.name"];
  
  for (const name of validNames) {
    const envVar: EnvironmentVariable = {
      name,
      value: "test-value",
      sensitive: false
    };
    
    const validation = validator.validateEnvironmentVariable(envVar);
    assertEquals(validation.valid, true, `Name ${name} should be valid`);
  }
  
  for (const name of invalidNames) {
    const envVar: EnvironmentVariable = {
      name,
      value: "test-value",
      sensitive: false
    };
    
    const validation = validator.validateEnvironmentVariable(envVar);
    assertEquals(validation.valid, false, `Name ${name} should be invalid`);
  }
});
