#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import deno from "../deno.json" with { type: "json" };
import {
  createRadarrConfig,
  type RadarrConfig,
  testConnection as testRadarrConnection,
} from "@wyattjoh/radarr";
import {
  createSonarrConfig,
  type SonarrConfig,
  testConnection as testSonarrConnection,
} from "@wyattjoh/sonarr";
import {
  createTMDBConfig,
  testConnection as testTMDBConnection,
  type TMDBConfig,
} from "@wyattjoh/tmdb";
import { createRadarrTools } from "./tools/radarr-tools.ts";
import { createSonarrTools } from "./tools/sonarr-tools.ts";
import { createTMDBTools } from "./tools/tmdb-tools.ts";
import {
  createToolFilter,
  loadToolConfigFile,
  logToolConfiguration,
  parseToolConfig,
} from "./tools/tool-filter.ts";

interface ServerState {
  server: McpServer;
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
}

async function createServer(): Promise<ServerState> {
  const server = new McpServer(
    {
      name: "media-server-mcp",
      version: deno.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const state: ServerState = { server };
  loadConfig(state);
  await setupTools(state);
  return state;
}

function loadConfig(state: ServerState): void {
  // Load Radarr configuration
  const radarrUrl = Deno.env.get("RADARR_URL");
  const radarrApiKey = Deno.env.get("RADARR_API_KEY");
  if (radarrUrl && radarrApiKey) {
    state.radarrConfig = createRadarrConfig(radarrUrl, radarrApiKey);
  }

  // Load Sonarr configuration
  const sonarrUrl = Deno.env.get("SONARR_URL");
  const sonarrApiKey = Deno.env.get("SONARR_API_KEY");
  if (sonarrUrl && sonarrApiKey) {
    state.sonarrConfig = createSonarrConfig(sonarrUrl, sonarrApiKey);
  }

  // Load TMDB configuration
  const tmdbApiKey = Deno.env.get("TMDB_API_KEY");
  if (tmdbApiKey) {
    state.tmdbConfig = createTMDBConfig(tmdbApiKey);
  }

  if (
    !state.radarrConfig && !state.sonarrConfig &&
    !state.tmdbConfig
  ) {
    throw new Error(
      "At least one service must be configured. Please set RADARR_URL/RADARR_API_KEY, SONARR_URL/SONARR_API_KEY, or TMDB_API_KEY environment variables.",
    );
  }
}

async function setupTools(state: ServerState): Promise<void> {
  // Load tool configuration from file if specified
  const configFileContent = await loadToolConfigFile();

  // Parse tool configuration
  const toolConfig = parseToolConfig(configFileContent);
  const isToolEnabled = createToolFilter(toolConfig);

  // Log tool configuration for debugging
  logToolConfiguration(toolConfig);

  // Register Radarr tools if configured
  if (state.radarrConfig) {
    createRadarrTools(state.server, state.radarrConfig, isToolEnabled);
  }

  // Register Sonarr tools if configured
  if (state.sonarrConfig) {
    createSonarrTools(state.server, state.sonarrConfig, isToolEnabled);
  }

  // Register TMDB tools if configured
  if (state.tmdbConfig) {
    createTMDBTools(state.server, state.tmdbConfig, isToolEnabled);
  }

  // Error handling will be handled by the MCP framework

  process.on("SIGINT", async () => {
    await state.server.close();
  });
}

async function runServer(state: ServerState): Promise<void> {
  // Test connections before starting
  if (state.radarrConfig) {
    try {
      const result = await testRadarrConnection(state.radarrConfig);
      if (result.success) {
        console.error("[INFO] Successfully connected to Radarr");
      } else {
        console.error("[WARNING] Failed to connect to Radarr:", result.error);
      }
    } catch (error) {
      console.error(
        "[WARNING] Radarr connection test failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (state.sonarrConfig) {
    try {
      const result = await testSonarrConnection(state.sonarrConfig);
      if (result.success) {
        console.error("[INFO] Successfully connected to Sonarr");
      } else {
        console.error("[WARNING] Failed to connect to Sonarr:", result.error);
      }
    } catch (error) {
      console.error(
        "[WARNING] Sonarr connection test failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  if (state.tmdbConfig) {
    try {
      const result = await testTMDBConnection(state.tmdbConfig);
      if (result.success) {
        console.error("[INFO] Successfully connected to TMDB");
      } else {
        console.error("[WARNING] Failed to connect to TMDB:", result.error);
      }
    } catch (error) {
      console.error(
        "[WARNING] TMDB connection test failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const transport = new StdioServerTransport();
  await state.server.connect(transport);
  console.error("[INFO] Media Server MCP Server running on stdio");
}

async function main(): Promise<void> {
  try {
    const serverState = await createServer();
    await runServer(serverState);
  } catch (error) {
    console.error(
      "[FATAL]",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
