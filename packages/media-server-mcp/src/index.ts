#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import deno from "../deno.json" with { type: "json" };
import { createSSEServer } from "./transports/sse.ts";
import { createStdioServer } from "./transports/stdio.ts";
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
import { configureLogging, getLogger } from "./logging.ts";

interface ServerState {
  server: McpServer;
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  authToken?: string;
  transport?: { close: () => Promise<void> };
}

async function createServer(): Promise<ServerState> {
  const logger = getLogger(["media-server-mcp"]);

  logger.debug("Creating MCP server", {
    name: "media-server-mcp",
    version: deno.version,
  });

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

  logger.debug("Server created successfully");
  return state;
}

function loadConfig(state: ServerState): void {
  const logger = getLogger(["media-server-mcp"]);
  logger.debug("Loading configuration from environment variables");

  // Load Radarr configuration
  const radarrUrl = Deno.env.get("RADARR_URL");
  const radarrApiKey = Deno.env.get("RADARR_API_KEY");
  if (radarrUrl && radarrApiKey) {
    state.radarrConfig = createRadarrConfig(radarrUrl, radarrApiKey);
    logger.debug("Radarr configuration loaded: url={radarrUrl}", { radarrUrl });
  }

  // Load Sonarr configuration
  const sonarrUrl = Deno.env.get("SONARR_URL");
  const sonarrApiKey = Deno.env.get("SONARR_API_KEY");
  if (sonarrUrl && sonarrApiKey) {
    state.sonarrConfig = createSonarrConfig(sonarrUrl, sonarrApiKey);
    logger.debug("Sonarr configuration loaded: url={sonarrUrl}", { sonarrUrl });
  }

  // Load TMDB configuration
  const tmdbApiKey = Deno.env.get("TMDB_API_KEY");
  if (tmdbApiKey) {
    state.tmdbConfig = createTMDBConfig(tmdbApiKey);
    logger.debug("TMDB configuration loaded");
  }

  // Load authentication token
  const authToken = Deno.env.get("MCP_AUTH_TOKEN");
  if (authToken) {
    state.authToken = authToken;
  }
  if (state.authToken) {
    logger.debug("Authentication token loaded for SSE mode");
  }

  const configuredServices = [
    state.radarrConfig ? "Radarr" : null,
    state.sonarrConfig ? "Sonarr" : null,
    state.tmdbConfig ? "TMDB" : null,
  ].filter(Boolean);

  logger.info("Services configured: {services}", {
    services: configuredServices,
  });

  if (configuredServices.length === 0) {
    throw new Error(
      "At least one service must be configured. Please set RADARR_URL/RADARR_API_KEY, SONARR_URL/SONARR_API_KEY, or TMDB_API_KEY environment variables.",
    );
  }
}

async function setupTools(state: Readonly<ServerState>): Promise<void> {
  const logger = getLogger(["media-server-mcp", "tools"]);
  logger.debug("Setting up tools and filters");

  // Load tool configuration from file if specified
  const configFileContent = await loadToolConfigFile();

  // Parse tool configuration
  const toolConfig = parseToolConfig(configFileContent);
  const isToolEnabled = createToolFilter(toolConfig);

  // Log tool configuration for debugging
  logToolConfiguration(toolConfig);

  // Register Radarr tools if configured
  if (state.radarrConfig) {
    logger.debug("Registering Radarr tools");
    createRadarrTools(
      state.server,
      state.radarrConfig,
      isToolEnabled,
    );
  }

  // Register Sonarr tools if configured
  if (state.sonarrConfig) {
    logger.debug("Registering Sonarr tools");
    createSonarrTools(
      state.server,
      state.sonarrConfig,
      isToolEnabled,
    );
  }

  // Register TMDB tools if configured
  if (state.tmdbConfig) {
    logger.debug("Registering TMDB tools");
    createTMDBTools(
      state.server,
      state.tmdbConfig,
      isToolEnabled,
    );
  }

  logger.info("Tools registration completed");
}

async function testConnections(state: Readonly<ServerState>): Promise<void> {
  const logger = getLogger(["media-server-mcp", "connection"]);

  // Test connections before starting
  if (state.radarrConfig) {
    try {
      const result = await testRadarrConnection(state.radarrConfig);
      if (result.success) {
        logger.info("Successfully connected to Radarr");
      } else {
        logger.warn("Failed to connect to Radarr", { error: result.error });
      }
    } catch (error) {
      logger.warn("Radarr connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (state.sonarrConfig) {
    try {
      const result = await testSonarrConnection(state.sonarrConfig);
      if (result.success) {
        logger.info("Successfully connected to Sonarr");
      } else {
        logger.warn("Failed to connect to Sonarr", { error: result.error });
      }
    } catch (error) {
      logger.warn("Sonarr connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (state.tmdbConfig) {
    try {
      const result = await testTMDBConnection(state.tmdbConfig);
      if (result.success) {
        logger.info("Successfully connected to TMDB");
      } else {
        logger.warn("Failed to connect to TMDB", { error: result.error });
      }
    } catch (error) {
      logger.warn("TMDB connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function runStdioServer(state: ServerState): Promise<void> {
  await testConnections(state);

  state.transport = await createStdioServer({ server: state.server });
}

async function runSSEServer(
  state: ServerState,
  port: number,
): Promise<void> {
  // Require authentication token in SSE mode
  if (!state.authToken) {
    throw new Error(
      "MCP_AUTH_TOKEN environment variable is required when running in SSE mode for security.",
    );
  }

  await testConnections(state);

  // Start SSE server with authentication token
  state.transport = createSSEServer({
    port,
    server: state.server,
    authToken: state.authToken,
  });
}

function setupGracefulShutdown(state: ServerState): void {
  const logger = getLogger(["media-server-mcp"]);

  const cleanup = async () => {
    logger.info("Received shutdown signal, cleaning up gracefully");

    try {
      // Close transport first
      if (state.transport) {
        await state.transport.close();
      }

      // Then close the MCP server
      await state.server.close();

      logger.info("Graceful shutdown completed");
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Force exit after cleanup attempt
      Deno.exit(0);
    }
  };

  // Handle various shutdown signals
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Handle unhandled promise rejections and exceptions
  process.on("unhandledRejection", (reason, _promise) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    cleanup();
  });

  process.on("uncaughtException", (error) => {
    logger.fatal("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    cleanup();
  });
}

async function main(): Promise<void> {
  try {
    const command = new Command()
      .name("media-server-mcp")
      .version(deno.version)
      .description(
        "Media Server MCP - Model Context Protocol server for Radarr, Sonarr, and TMDB",
      )
      .option(
        "--sse",
        "Run server in SSE (Server-Sent Events) mode over HTTP instead of stdio",
      )
      .option("-p, --port <port:number>", "Port to run SSE server on", {
        default: 3000,
      })
      .option("--debug", "Enable debug logging for verbose output")
      .action(async (options) => {
        // Configure logging first
        await configureLogging({
          debug: options.debug || false,
          useStdio: !options.sse,
        });

        const serverState = await createServer();

        // Setup graceful shutdown handling
        setupGracefulShutdown(serverState);

        if (options.sse) {
          await runSSEServer(serverState, options.port);
        } else {
          await runStdioServer(serverState);
        }
      });

    await command.parse(Deno.args);
  } catch (error) {
    // Use basic console.error for fatal errors before logging is configured
    // or if logging configuration fails
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
