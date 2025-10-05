#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { Command } from "@cliffy/command";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import deno from "../deno.json" with { type: "json" };
import { createSSEServer } from "./transports/sse.ts";
import { createStdioServer } from "./transports/stdio.ts";
import { createHealthService, type HealthService } from "./docker/health-service.ts";
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
import { configureLogging, getLogger, isDockerContainer } from "./logging.ts";

interface ServerState {
  server: McpServer;
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
  authToken?: string;
  transport?: { close: () => Promise<void> };
  healthService?: HealthService;
  startTime: Date;
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

  const state: ServerState = { 
    server, 
    startTime: new Date() 
  };
  loadConfig(state);
  await setupTools(state);
  setupHealthService(state);

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
  }
  if (state.authToken) {
    logger.debug("Authentication token loaded for SSE mode");
  }

  // Load Docker-specific environment variables
  const dockerContainer = Deno.env.get("DOCKER_CONTAINER");
  const containerId = Deno.env.get("HOSTNAME") || Deno.env.get("CONTAINER_ID");
  const containerImage = Deno.env.get("CONTAINER_IMAGE");
  const containerName = Deno.env.get("CONTAINER_NAME");
  const containerVersion = Deno.env.get("CONTAINER_VERSION");
  const dockerNetwork = Deno.env.get("DOCKER_NETWORK");
  const dockerHost = Deno.env.get("DOCKER_HOST");
  
  if (dockerContainer === "true") {
    logger.debug("Running in Docker container", {
      containerId,
      containerImage,
      containerName,
      containerVersion,
      dockerNetwork,
      dockerHost,
    });
  }

  // Log Docker-specific configuration if available
  const dockerConfig = {
    containerId,
    containerImage,
    containerName,
    containerVersion,
    dockerNetwork,
    dockerHost,
  };
  
  const hasDockerConfig = Object.values(dockerConfig).some(value => value !== undefined);
  if (hasDockerConfig) {
    logger.info("Docker environment detected", dockerConfig);
  }

  // Load Docker-specific tool and debug configuration
  const dockerToolProfile = Deno.env.get("DOCKER_TOOL_PROFILE");
  const dockerDebugMode = Deno.env.get("DOCKER_DEBUG_MODE");
  const dockerLogLevel = Deno.env.get("DOCKER_LOG_LEVEL");
  
  if (dockerToolProfile || dockerDebugMode || dockerLogLevel) {
    logger.debug("Docker-specific configuration loaded", {
      toolProfile: dockerToolProfile,
      debugMode: dockerDebugMode,
      logLevel: dockerLogLevel,
    });
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

  // Register Plex tools if configured
  if (state.plexConfig) {
    logger.debug("Registering Plex tools");
    createPlexTools(
      state.server,
      state.plexConfig,
      isToolEnabled,
    );
  }

  logger.info("Tools registration completed");
}

function setupHealthService(state: ServerState): void {
  const logger = getLogger(["media-server-mcp", "health"]);
  logger.debug("Setting up health service");

  // Determine transport mode based on whether auth token is configured
  const transportMode = state.authToken ? "sse" : "stdio";

  // Create health service with service configurations
  state.healthService = createHealthService({
    serviceConfigs: {
      radarrConfig: state.radarrConfig,
      sonarrConfig: state.sonarrConfig,
      tmdbConfig: state.tmdbConfig,
      plexConfig: state.plexConfig,
    },
    transportMode,
    version: deno.version,
    startTime: state.startTime,
  });

  logger.debug("Health service created", { transportMode });
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

  if (state.plexConfig) {
    try {
      const result = await testPlexConnection(state.plexConfig);
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

  // Start SSE server with authentication token and health service
  state.transport = createSSEServer({
    port,
    server: state.server,
    authToken: state.authToken,
    healthService: state.healthService!,
  });
}

function setupGracefulShutdown(state: ServerState): void {
  const logger = getLogger(["media-server-mcp"]);

  // Docker-specific shutdown timeout (30 seconds)
  const SHUTDOWN_TIMEOUT = 30000;
  let isShuttingDown = false;

  const cleanup = async (signal?: string) => {
    if (isShuttingDown) {
      logger.warn("Shutdown already in progress, ignoring signal", { signal });
      return;
    }
    
    isShuttingDown = true;
    logger.info("Received shutdown signal, cleaning up gracefully", { signal });

    try {
      // Set a timeout for graceful shutdown (Docker best practice)
      const shutdownTimer = setTimeout(() => {
        logger.error("Graceful shutdown timeout exceeded, forcing exit");
        Deno.exit(1);
      }, SHUTDOWN_TIMEOUT);

      // Close transport first
      if (state.transport) {
        logger.debug("Closing transport connection");
        await state.transport.close();
      }

      // Then close the MCP server
      logger.debug("Closing MCP server");
      await state.server.close();

      // Clear the timeout since we completed gracefully
      clearTimeout(shutdownTimer);

      logger.info("Graceful shutdown completed successfully");
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      // Force exit after cleanup attempt
      Deno.exit(0);
    }
  };

  // Handle various shutdown signals (Docker uses SIGTERM)
  process.on("SIGINT", () => cleanup("SIGINT"));
  process.on("SIGTERM", () => cleanup("SIGTERM"));
  
  // Docker-specific signals
  process.on("SIGQUIT", () => cleanup("SIGQUIT"));

  // Handle unhandled promise rejections and exceptions
  process.on("unhandledRejection", (reason, _promise) => {
    logger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    cleanup("unhandledRejection");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    cleanup("uncaughtException");
  });

  // Log shutdown signal handlers are registered
  logger.debug("Graceful shutdown handlers registered", {
    signals: ["SIGINT", "SIGTERM", "SIGQUIT"],
    timeout: SHUTDOWN_TIMEOUT,
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
        // Detect container mode and configure logging
        const containerMode = await isDockerContainer();
        await configureLogging({
          debug: options.debug || false,
          useStdio: !options.sse,
          containerMode,
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
