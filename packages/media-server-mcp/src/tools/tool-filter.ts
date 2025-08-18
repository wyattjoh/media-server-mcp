import {
  getToolsForBranches,
  getToolsForProfile,
  isToolEnabled,
  TOOL_PROFILES,
} from "./tool-categories.ts";

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
      console.error(
        "[WARNING] Failed to parse tool config file:",
        error instanceof Error ? error.message : String(error),
      );
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
    console.error(
      `[WARNING] Unknown tool profile '${config.profile}', using 'default'`,
    );
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
    console.error(
      `[WARNING] Failed to read tool config file '${configPath}':`,
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/**
 * Log the current tool configuration for debugging
 */
export function logToolConfiguration(config: ToolFilterConfig): void {
  const enabledTools = getEnabledTools(config);

  console.error(`[INFO] Tool Configuration:`);
  console.error(`  Profile: ${config.profile}`);

  if (config.additionalBranches.length > 0) {
    console.error(
      `  Additional Branches: ${config.additionalBranches.join(", ")}`,
    );
  }

  if (config.excludeTools.length > 0) {
    console.error(`  Excluded Tools: ${config.excludeTools.join(", ")}`);
  }

  if (config.includeTools.length > 0) {
    console.error(`  Included Tools: ${config.includeTools.join(", ")}`);
  }

  console.error(`  Total Enabled Tools: ${enabledTools.length}`);
}
