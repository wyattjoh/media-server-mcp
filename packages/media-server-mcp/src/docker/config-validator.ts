/**
 * Environment variable validation for Docker integration
 * 
 * Provides functionality for validating environment variables,
 * service configurations, and Docker-specific settings.
 */

import { getLogger } from "../logging.ts";
import type { 
  EnvironmentConfiguration, 
  EnvironmentVariable 
} from "../types/docker-types.ts";

interface ConfigValidatorOptions {
  requiredServices?: string[];
  strictMode?: boolean;
}

/**
 * Configuration validator for Docker environment variables
 */
export function createConfigValidator(options: ConfigValidatorOptions = {}) {
  const logger = getLogger(["media-server-mcp", "docker", "config"]);
  const { requiredServices = [], strictMode = false } = options;

  /**
   * Validate URL format
   */
  function isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Validate API key format
   */
  function isValidApiKey(apiKey: string): boolean {
    // API keys should be non-empty strings
    return typeof apiKey === "string" && apiKey.trim().length > 0;
  }

  /**
   * Validate service URL and API key pair
   */
  function validateServiceConfig(
    serviceName: string,
    url?: string,
    apiKey?: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // If URL is provided, it must be valid
    if (url && !isValidUrl(url)) {
      errors.push(`${serviceName} URL is invalid: ${url}`);
    }

    // If API key is provided, it must be valid
    if (apiKey && !isValidApiKey(apiKey)) {
      errors.push(`${serviceName} API key is invalid`);
    }

    // If URL is provided but API key is missing
    if (url && !apiKey) {
      errors.push(`${serviceName} URL provided but API key is missing`);
    }

    // If API key is provided but URL is missing
    if (apiKey && !url) {
      errors.push(`${serviceName} API key provided but URL is missing`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate environment configuration
   */
  function validateEnvironmentConfig(
    config: EnvironmentConfiguration,
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    logger.debug("Validating environment configuration", {
      hasRadarr: !!(config.radarrUrl || config.radarrApiKey),
      hasSonarr: !!(config.sonarrUrl || config.sonarrApiKey),
      hasTmdb: !!config.tmdbApiKey,
      hasPlex: !!(config.plexUrl || config.plexApiKey),
      hasAuthToken: !!config.mcpAuthToken,
      debugMode: config.debugMode,
    });

    // Validate Radarr configuration
    if (config.radarrUrl || config.radarrApiKey) {
      const radarrValidation = validateServiceConfig(
        "Radarr",
        config.radarrUrl,
        config.radarrApiKey,
      );
      if (!radarrValidation.valid) {
        errors.push(...radarrValidation.errors);
      }
    }

    // Validate Sonarr configuration
    if (config.sonarrUrl || config.sonarrApiKey) {
      const sonarrValidation = validateServiceConfig(
        "Sonarr",
        config.sonarrUrl,
        config.sonarrApiKey,
      );
      if (!sonarrValidation.valid) {
        errors.push(...sonarrValidation.errors);
      }
    }

    // Validate TMDB configuration
    if (config.tmdbApiKey) {
      if (!isValidApiKey(config.tmdbApiKey)) {
        errors.push("TMDB API key is invalid");
      }
    }

    // Validate Plex configuration
    if (config.plexUrl || config.plexApiKey) {
      const plexValidation = validateServiceConfig(
        "Plex",
        config.plexUrl,
        config.plexApiKey,
      );
      if (!plexValidation.valid) {
        errors.push(...plexValidation.errors);
      }
    }

    // Validate MCP auth token (required for SSE mode)
    if (config.mcpAuthToken) {
      if (!isValidApiKey(config.mcpAuthToken)) {
        errors.push("MCP auth token is invalid");
      }
    }

    // Check if at least one service is configured
    const hasAnyService = !!(
      config.radarrUrl ||
      config.sonarrUrl ||
      config.tmdbApiKey ||
      config.plexUrl
    );

    if (!hasAnyService) {
      if (strictMode) {
        errors.push("At least one service must be configured (Radarr, Sonarr, TMDB, or Plex)");
      } else {
        warnings.push("No services configured - server will have limited functionality");
      }
    }

    // Validate tool profile
    if (config.toolProfile) {
      const validProfiles = ["default", "curator", "maintainer", "power-user", "full"];
      if (!validProfiles.includes(config.toolProfile)) {
        warnings.push(`Unknown tool profile: ${config.toolProfile}. Valid profiles: ${validProfiles.join(", ")}`);
      }
    }

    // Validate debug mode
    if (typeof config.debugMode !== "boolean") {
      errors.push("Debug mode must be a boolean value");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual environment variable
   */
  function validateEnvironmentVariable(
    envVar: EnvironmentVariable,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!envVar.name || envVar.name.trim() === "") {
      errors.push("Environment variable name is required");
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(envVar.name)) {
      errors.push(`Invalid environment variable name: ${envVar.name}. Must start with letter or underscore and contain only uppercase letters, numbers, and underscores`);
    }

    // Validate value
    if (typeof envVar.value !== "string") {
      errors.push(`Environment variable value must be a string: ${envVar.name}`);
    }

    // Check for sensitive variables
    if (envVar.sensitive && envVar.value === "") {
      errors.push(`Sensitive environment variable cannot be empty: ${envVar.name}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate all environment variables
   */
  function validateAllEnvironmentVariables(
    envVars: EnvironmentVariable[],
  ): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    const variableNames = new Set<string>();

    for (const envVar of envVars) {
      const validation = validateEnvironmentVariable(envVar);
      if (!validation.valid) {
        allErrors.push(...validation.errors);
      }

      // Check for duplicate names
      if (variableNames.has(envVar.name)) {
        allErrors.push(`Duplicate environment variable name: ${envVar.name}`);
      } else {
        variableNames.add(envVar.name);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Extract environment configuration from environment variables
   */
  function extractEnvironmentConfig(): EnvironmentConfiguration {
    return {
      radarrUrl: Deno.env.get("RADARR_URL"),
      radarrApiKey: Deno.env.get("RADARR_API_KEY"),
      sonarrUrl: Deno.env.get("SONARR_URL"),
      sonarrApiKey: Deno.env.get("SONARR_API_KEY"),
      tmdbApiKey: Deno.env.get("TMDB_API_KEY"),
      plexUrl: Deno.env.get("PLEX_URL"),
      plexApiKey: Deno.env.get("PLEX_API_KEY"),
      mcpAuthToken: Deno.env.get("MCP_AUTH_TOKEN"),
      toolProfile: Deno.env.get("TOOL_PROFILE"),
      debugMode: Deno.env.get("DEBUG_MODE") === "true",
    };
  }

  /**
   * Get environment variables for Docker
   */
  function getDockerEnvironmentVariables(): EnvironmentVariable[] {
    const envVars: EnvironmentVariable[] = [];

    // Add service configuration variables
    const serviceVars = [
      "RADARR_URL",
      "RADARR_API_KEY",
      "SONARR_URL",
      "SONARR_API_KEY",
      "TMDB_API_KEY",
      "PLEX_URL",
      "PLEX_API_KEY",
      "MCP_AUTH_TOKEN",
      "TOOL_PROFILE",
      "DEBUG_MODE",
    ];

    for (const varName of serviceVars) {
      const value = Deno.env.get(varName);
      if (value !== undefined) {
        envVars.push({
          name: varName,
          value,
          sensitive: varName.includes("API_KEY") || varName.includes("TOKEN"),
        });
      }
    }

    return envVars;
  }

  /**
   * Validate Docker-specific configuration
   */
  function validateDockerConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required Docker environment variables
    const requiredDockerVars = ["HOSTNAME"];
    for (const varName of requiredDockerVars) {
      if (!Deno.env.get(varName)) {
        warnings.push(`Docker environment variable not set: ${varName}`);
      }
    }

    // Validate port configuration
    const port = Deno.env.get("PORT");
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`Invalid port number: ${port}`);
      }
    }

    // Check for volume mount points
    const volumePaths = ["/app/logs", "/app/config"];
    for (const path of volumePaths) {
      try {
        const stat = Deno.statSync(path);
        if (!stat.isDirectory) {
          errors.push(`Volume mount point is not a directory: ${path}`);
        }
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          warnings.push(`Volume mount point not found: ${path}`);
        } else {
          errors.push(`Failed to check volume mount point ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get configuration summary
   */
  function getConfigurationSummary(): {
    servicesConfigured: string[];
    totalEnvironmentVariables: number;
    sensitiveVariables: number;
    validationErrors: number;
    validationWarnings: number;
  } {
    const config = extractEnvironmentConfig();
    const envVars = getDockerEnvironmentVariables();
    
    const servicesConfigured: string[] = [];
    if (config.radarrUrl) servicesConfigured.push("Radarr");
    if (config.sonarrUrl) servicesConfigured.push("Sonarr");
    if (config.tmdbApiKey) servicesConfigured.push("TMDB");
    if (config.plexUrl) servicesConfigured.push("Plex");

    const sensitiveVariables = envVars.filter(env => env.sensitive).length;

    // Run validations and count errors/warnings
    let validationErrors = 0;
    let validationWarnings = 0;

    // Validate environment config
    const envConfigResults = validateEnvironmentConfig(config);
    if (Array.isArray(envConfigResults)) {
      validationErrors += envConfigResults.filter(r => r.level === "error").length;
      validationWarnings += envConfigResults.filter(r => r.level === "warning").length;
    }

    // Validate Docker config
    const dockerConfigResults = validateDockerConfig(config);
    if (Array.isArray(dockerConfigResults)) {
      validationErrors += dockerConfigResults.filter(r => r.level === "error").length;
      validationWarnings += dockerConfigResults.filter(r => r.level === "warning").length;
    }

    return {
      servicesConfigured,
      totalEnvironmentVariables: envVars.length,
      sensitiveVariables,
      validationErrors,
      validationWarnings,
    };
  }

  return {
    validateServiceConfig,
    validateEnvironmentConfig,
    validateEnvironmentVariable,
    validateAllEnvironmentVariables,
    extractEnvironmentConfig,
    getDockerEnvironmentVariables,
    validateDockerConfig,
    getConfigurationSummary,
  };
}

export type ConfigValidator = ReturnType<typeof createConfigValidator>;
