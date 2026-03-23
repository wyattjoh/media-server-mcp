#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import deno from "../deno.json" with { type: "json" };
import { createSSEServer } from "./transports/sse.ts";
import { createStdioServer } from "./transports/stdio.ts";
import { createStreamableHTTPServer } from "./transports/streamable-http.ts";
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
import {
  createPlexConfig,
  type PlexConfig,
  testConnection as testPlexConnection,
} from "@wyattjoh/plex";
import { createRadarrTools } from "./tools/radarr-tools.ts";
import { createSonarrTools } from "./tools/sonarr-tools.ts";
import { createTMDBTools } from "./tools/tmdb-tools.ts";
import { createPlexTools } from "./tools/plex-tools.ts";
import {
  createToolFilter,
  loadToolConfigFile,
  logToolConfiguration,
  parseToolConfig,
} from "./tools/tool-filter.ts";
import { configureLogging, getLogger } from "./logging.ts";

interface ServiceConfig {
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
  authToken?: string;
}

interface ServerState extends ServiceConfig {
  server: McpServer;
  transport?: { close: () => Promise<void> };
}

/**
 * Create a new McpServer instance with tools registered based on
 * the given service configuration.
 */
async function createMcpServerWithTools(
  config: ServiceConfig,
): Promise<McpServer> {
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

  await setupTools(server, config);

  logger.debug("Server created successfully");
  return server;
}

async function createServer(): Promise<ServerState> {
  const config: ServiceConfig = {};
  loadConfig(config);
  await testConnections(config);

  const server = await createMcpServerWithTools(config);

  return { ...config, server };
}

function loadConfig(state: ServiceConfig): void {
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

  // Load Plex configuration
  const plexUrl = Deno.env.get("PLEX_URL");
  const plexApiKey = Deno.env.get("PLEX_API_KEY");
  if (plexUrl && plexApiKey) {
    state.plexConfig = createPlexConfig(plexUrl, plexApiKey);
    logger.debug("Plex configuration loaded: url={plexUrl}", { plexUrl });
  }

  // Load authentication token
  const authToken = Deno.env.get("MCP_AUTH_TOKEN");
  if (authToken) {
    state.authToken = authToken;
    logger.debug("Authentication token loaded");
  }

  const configuredServices = [
    state.radarrConfig ? "Radarr" : null,
    state.sonarrConfig ? "Sonarr" : null,
    state.tmdbConfig ? "TMDB" : null,
    state.plexConfig ? "Plex" : null,
  ].filter(Boolean);

  logger.info("Services configured: {services}", {
    services: configuredServices,
  });

  if (configuredServices.length === 0) {
    throw new Error(
      "At least one service must be configured. Please set RADARR_URL/RADARR_API_KEY, SONARR_URL/SONARR_API_KEY, TMDB_API_KEY, or PLEX_URL/PLEX_API_KEY environment variables.",
    );
  }
}

async function setupTools(
  server: McpServer,
  config: Readonly<ServiceConfig>,
): Promise<void> {
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
  if (config.radarrConfig) {
    logger.debug("Registering Radarr tools");
    createRadarrTools(
      server,
      config.radarrConfig,
      isToolEnabled,
    );
  }

  // Register Sonarr tools if configured
  if (config.sonarrConfig) {
    logger.debug("Registering Sonarr tools");
    createSonarrTools(
      server,
      config.sonarrConfig,
      isToolEnabled,
    );
  }

  // Register TMDB tools if configured
  if (config.tmdbConfig) {
    logger.debug("Registering TMDB tools");
    createTMDBTools(
      server,
      config.tmdbConfig,
      isToolEnabled,
    );
  }

  // Register Plex tools if configured
  if (config.plexConfig) {
    logger.debug("Registering Plex tools");
    createPlexTools(
      server,
      config.plexConfig,
      isToolEnabled,
    );
  }

  logger.info("Tools registration completed");
}

async function testConnections(
  config: Readonly<ServiceConfig>,
): Promise<void> {
  const logger = getLogger(["media-server-mcp", "connection"]);

  // Test connections before starting
  if (config.radarrConfig) {
    try {
      const result = await testRadarrConnection(config.radarrConfig);
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

  if (config.sonarrConfig) {
    try {
      const result = await testSonarrConnection(config.sonarrConfig);
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

  if (config.tmdbConfig) {
    try {
      const result = await testTMDBConnection(config.tmdbConfig);
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

  if (config.plexConfig) {
    try {
      const result = await testPlexConnection(config.plexConfig);
      if (result.success) {
        logger.info("Successfully connected to Plex");
      } else {
        logger.warn("Failed to connect to Plex", { error: result.error });
      }
    } catch (error) {
      logger.warn("Plex connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function runStdioServer(state: ServerState): Promise<void> {
  state.transport = await createStdioServer({ server: state.server });
}

function runSSEServer(
  state: ServerState,
  port: number,
): void {
  // Require authentication token in SSE mode
  if (!state.authToken) {
    throw new Error(
      "MCP_AUTH_TOKEN environment variable is required when running in SSE mode for security.",
    );
  }

  // Start SSE server with authentication token
  state.transport = createSSEServer({
    port,
    server: state.server,
    authToken: state.authToken,
  });
}

function runStreamableHTTPServer(
  state: ServerState,
  port: number,
  host: string,
): void {
  // Require authentication when binding to non-loopback addresses
  const isLoopback = host === "127.0.0.1" || host === "localhost" ||
    host === "::1";
  if (!state.authToken && !isLoopback) {
    throw new Error(
      "MCP_AUTH_TOKEN environment variable is required when binding to non-loopback addresses. " +
        "Use --host 127.0.0.1 for unauthenticated local development.",
    );
  }

  state.transport = createStreamableHTTPServer({
    port,
    host,
    createMcpServer: () => createMcpServerWithTools(state),
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
      .option(
        "--http",
        "Run server in Streamable HTTP mode (recommended for remote MCP)",
      )
      .option("-p, --port <port:number>", "Port to run HTTP server on", {
        default: 3000,
      })
      .option(
        "--host <host:string>",
        "Host to bind the HTTP server to",
        { default: "0.0.0.0" },
      )
      .option("--debug", "Enable debug logging for verbose output")
      .action(async (options) => {
        if (options.sse && options.http) {
          throw new Error(
            "Cannot use both --sse and --http flags. Choose one transport mode.",
          );
        }

        const isRemote = options.sse || options.http;

        // Configure logging first
        await configureLogging({
          debug: options.debug || false,
          useStdio: !isRemote,
        });

        const logger = getLogger(["media-server-mcp"]);
        const serverState = await createServer();

        // Setup graceful shutdown handling
        setupGracefulShutdown(serverState);

        if (options.http) {
          runStreamableHTTPServer(
            serverState,
            options.port,
            options.host,
          );
        } else if (options.sse) {
          if (options.host !== "0.0.0.0") {
            logger.warn(
              "--host option is not supported in SSE mode and will be ignored",
            );
          }
          runSSEServer(serverState, options.port);
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
