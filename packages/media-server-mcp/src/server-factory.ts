import { McpServer } from "@modelcontextprotocol/server";
import type { PlexConfig } from "@wyattjoh/plex";
import type { RadarrConfig } from "@wyattjoh/radarr";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import deno from "../deno.json" with { type: "json" };
import { getLogger } from "./logging.ts";
import { createAddMoviePrompt } from "./prompts/add-movie-prompt.ts";
import { createAddSeriesPrompt } from "./prompts/add-series-prompt.ts";
import { createLibraryReportPrompt } from "./prompts/library-report-prompt.ts";
import { createRecommendationsPrompt } from "./prompts/recommendations-prompt.ts";
import { createPlexResources } from "./resources/plex-resources.ts";
import { createRadarrResources } from "./resources/radarr-resources.ts";
import { createSonarrResources } from "./resources/sonarr-resources.ts";
import { createTMDBResources } from "./resources/tmdb-resources.ts";
import { CODEMODE_LIMITS } from "./tools/codemode-executor.ts";
import {
  createCodeModeCatalog,
  createCodeModeTools,
} from "./tools/codemode-tools.ts";
import { createPlexTools } from "./tools/plex-tools.ts";
import { createRadarrTools } from "./tools/radarr-tools.ts";
import { createSonarrTools } from "./tools/sonarr-tools.ts";
import { createTMDBTools } from "./tools/tmdb-tools.ts";

export interface ServiceConfig {
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
  authToken?: string;
}

export type McpServerConfig = ServiceConfig & {
  isToolEnabled: (toolName: string) => boolean;
  isCodeMode?: boolean;
};

function formatLimit(value: number): string {
  return value.toLocaleString("en-US");
}

function createCodeModeInstructions(): string {
  return `Code Mode exposes a discovery and read-only execution facade over configured native media tools.

Workflow:
1. Call codemode_search to find exact native tool names.
2. Call codemode_describe with those names and use each described facadePath and input/output contract.
3. Call codemode_execute with an async JavaScript function body. Put every native tool name the code may call in selectedTools, call only its described facade path, and explicitly return a JSON value.

selectedTools is an exact per-execution authorization list, not a discovery filter. Mutation tools are discoverable but unavailable in Code Mode v1. Native tools are distinct from configured MCP resources and prompts: access resources and prompts through their MCP interfaces; some clients project resources as read_* conveniences, but those conveniences are not native Code Mode tools.

Generated code runs in a fresh restricted subprocess. It has no direct filesystem, network, environment, subprocess, or FFI authority; selected native tool calls are dispatched by the trusted host. State does not persist between executions.

Fixed limits (measured as UTF-8 JSON bytes where applicable):
- Source: ${formatLimit(CODEMODE_LIMITS.sourceBytes)} bytes.
- Input: ${formatLimit(CODEMODE_LIMITS.inputBytes)} bytes.
- Complete execution request: ${
    formatLimit(CODEMODE_LIMITS.requestBytes)
  } bytes.
- Runner protocol frame: ${formatLimit(CODEMODE_LIMITS.frameBytes)} bytes.
- Native tool calls: ${
    formatLimit(CODEMODE_LIMITS.toolCalls)
  } per execution, with at most ${
    formatLimit(CODEMODE_LIMITS.concurrentToolCalls)
  } concurrent calls.
- Native tool result: ${
    formatLimit(CODEMODE_LIMITS.toolResultBytes)
  } bytes per call and ${
    formatLimit(CODEMODE_LIMITS.totalToolResultBytes)
  } bytes across one execution.
- Final returned result: ${formatLimit(CODEMODE_LIMITS.finalResultBytes)} bytes.
- Retained diagnostics: ${formatLimit(CODEMODE_LIMITS.logBytes)} bytes.
- Execution timeout: ${
    formatLimit(CODEMODE_LIMITS.executionTimeoutMs)
  } milliseconds.
- Global execution concurrency: ${
    formatLimit(CODEMODE_LIMITS.concurrentExecutions)
  } executions.`;
}

/**
 * Creates an MCP server with tools, resources, and prompts for configured services.
 */
export function createMcpServerWithTools(config: McpServerConfig): McpServer {
  const logger = getLogger(["media-server-mcp"]);
  logger.debug("Creating MCP server", {
    name: "media-server-mcp",
    version: deno.version,
  });

  const server = new McpServer(
    { name: "media-server-mcp", version: deno.version },
    {
      capabilities: { tools: {}, resources: {}, prompts: {} },
      ...(config.isCodeMode
        ? { instructions: createCodeModeInstructions() }
        : {}),
    },
  );

  setupTools(server, config, config.isToolEnabled, config.isCodeMode ?? false);
  logger.debug("Server created successfully");
  return server;
}

function setupTools(
  server: McpServer,
  config: Readonly<ServiceConfig>,
  isToolEnabled: (toolName: string) => boolean,
  isCodeMode: boolean,
): void {
  const logger = getLogger(["media-server-mcp", "tools"]);
  logger.debug("Setting up tools");

  if (isCodeMode) {
    createCodeModeTools(server, createCodeModeCatalog(config), config);
  }
  if (config.radarrConfig && !isCodeMode) {
    createRadarrTools(server, config.radarrConfig, isToolEnabled);
  }
  if (config.sonarrConfig && !isCodeMode) {
    createSonarrTools(server, config.sonarrConfig, isToolEnabled);
  }
  if (config.tmdbConfig && !isCodeMode) {
    createTMDBTools(server, config.tmdbConfig, isToolEnabled);
  }
  if (config.plexConfig && !isCodeMode) {
    createPlexTools(server, config.plexConfig, isToolEnabled);
  }

  if (config.radarrConfig) createRadarrResources(server, config.radarrConfig);
  if (config.sonarrConfig) createSonarrResources(server, config.sonarrConfig);
  if (config.tmdbConfig) createTMDBResources(server, config.tmdbConfig);
  if (config.plexConfig) createPlexResources(server, config.plexConfig);

  if (config.radarrConfig) createAddMoviePrompt(server, config.radarrConfig);
  if (config.sonarrConfig) createAddSeriesPrompt(server, config.sonarrConfig);
  if (config.radarrConfig || config.sonarrConfig) {
    createLibraryReportPrompt(server);
  }
  if (config.tmdbConfig) createRecommendationsPrompt(server);
}
