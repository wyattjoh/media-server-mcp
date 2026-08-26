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
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
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
