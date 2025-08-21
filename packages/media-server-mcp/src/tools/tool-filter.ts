import {
  getToolsForBranches,
  getToolsForProfile,
  isToolEnabled,
  TOOL_PROFILES,
} from "./tool-categories.ts";
import { getLogger } from "../logging.ts";

export interface ToolFilterConfig {
  profile: string;
  additionalBranches: string[];
  excludeTools: string[];
  includeTools: string[];
}

export interface ToolConfigFromFile {
  toolProfile?: string;
  enabledBranches?: string[];
  customOverrides?: {
    exclude?: string[];
    include?: string[];
  };
}

/**
 * Parse tool configuration from environment variables and optional config file
 */
export function parseToolConfig(
  configFileContent?: string,
): ToolFilterConfig {
  // Default configuration
  const config: ToolFilterConfig = {
    profile: "default",
    additionalBranches: [],
    excludeTools: [],
    includeTools: [],
  };

  // Parse config file if provided
  if (configFileContent) {
    try {
      const fileConfig: ToolConfigFromFile = JSON.parse(configFileContent);

      if (fileConfig.toolProfile) {
        config.profile = fileConfig.toolProfile;
      }

      if (fileConfig.enabledBranches) {
        config.additionalBranches = fileConfig.enabledBranches;
      }

      if (fileConfig.customOverrides?.exclude) {
        config.excludeTools = fileConfig.customOverrides.exclude;
      }

      if (fileConfig.customOverrides?.include) {
        config.includeTools = fileConfig.customOverrides.include;
      }
    } catch (error) {
      const logger = getLogger(["media-server-mcp", "tools"]);
      logger.warn("Failed to parse tool config file", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Override with environment variables (env vars take precedence)
  const envProfile = Deno.env.get("TOOL_PROFILE");
  if (envProfile) {
    config.profile = envProfile;
  }

  const envBranches = Deno.env.get("TOOL_BRANCHES");
  if (envBranches) {
    config.additionalBranches = envBranches.split(",").map((b) => b.trim());
  }

  const envExclude = Deno.env.get("TOOL_EXCLUDE");
  if (envExclude) {
    config.excludeTools = envExclude.split(",").map((t) => t.trim());
  }

  const envInclude = Deno.env.get("TOOL_INCLUDE");
  if (envInclude) {
    config.includeTools = envInclude.split(",").map((t) => t.trim());
  }

  // Validate profile exists
  const validProfile = TOOL_PROFILES.find((p) => p.name === config.profile);
  if (!validProfile) {
    const logger = getLogger(["media-server-mcp", "tools"]);
    logger.warn("Unknown tool profile, using default", {
      requestedProfile: config.profile,
      defaultProfile: "default",
    });
    config.profile = "default";
  }

  return config;
}

/**
 * Get the final list of enabled tools based on configuration
 */
export function getEnabledTools(config: ToolFilterConfig): string[] {
  // Start with tools from the profile
  const enabledTools = new Set(getToolsForProfile(config.profile));

  // Add tools from additional branches
  if (config.additionalBranches.length > 0) {
    const additionalTools = getToolsForBranches(config.additionalBranches);
    for (const tool of additionalTools) {
      enabledTools.add(tool);
    }
  }

  // Remove excluded tools
  for (const tool of config.excludeTools) {
    enabledTools.delete(tool);
  }

  // Add explicitly included tools
  for (const tool of config.includeTools) {
    enabledTools.add(tool);
  }

  return Array.from(enabledTools);
}

/**
 * Create a tool filter function that checks if a tool should be registered
 */
export function createToolFilter(config: ToolFilterConfig) {
  const enabledTools = getEnabledTools(config);

  return function (toolName: string): boolean {
    return isToolEnabled(toolName, enabledTools);
  };
}

/**
 * Load tool configuration from file if TOOL_CONFIG_PATH is set
 */
export async function loadToolConfigFile(): Promise<string | undefined> {
  const configPath = Deno.env.get("TOOL_CONFIG_PATH");
  if (!configPath) {
    return undefined;
  }

  try {
    return await Deno.readTextFile(configPath);
  } catch (error) {
    const logger = getLogger(["media-server-mcp", "tools"]);
    logger.warn("Failed to read tool config file", {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * Log the current tool configuration for debugging
 */
export function logToolConfiguration(config: ToolFilterConfig): void {
  const logger = getLogger(["media-server-mcp", "tools"]);
  const enabledTools = getEnabledTools(config);

  logger.info("Tool Configuration {*}", {
    profile: config.profile,
    additionalBranches: config.additionalBranches,
    excludeTools: config.excludeTools,
    includeTools: config.includeTools,
    totalEnabledTools: enabledTools.length,
  });

  // Add debug logging for the actual tool list
  logger.debug("Enabled tools list", { enabledTools });
}
