#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import deno from "../deno.json" with { type: "json" };
import {
  createRadarrConfig,
  testConnection as testRadarrConnection,
} from "./clients/radarr.ts";
import {
  createSonarrConfig,
  testConnection as testSonarrConnection,
} from "./clients/sonarr.ts";
import type { RadarrConfig } from "./clients/radarr.ts";
import type { SonarrConfig } from "./clients/sonarr.ts";
import { createRadarrTools, handleRadarrTool } from "./tools/radarr-tools.ts";
import { createSonarrTools, handleSonarrTool } from "./tools/sonarr-tools.ts";

interface ServerState {
  server: Server;
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
}

function createServer(): ServerState {
  const server = new Server(
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
  setupHandlers(state);
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

  if (!state.radarrConfig && !state.sonarrConfig) {
    throw new Error(
      "At least one of Radarr or Sonarr must be configured. Please set RADARR_URL/RADARR_API_KEY or SONARR_URL/SONARR_API_KEY environment variables.",
    );
  }
}

function setupHandlers(state: ServerState): void {
  state.server.setRequestHandler(ListToolsRequestSchema, () => {
    const tools = [];

    if (state.radarrConfig) {
      tools.push(...createRadarrTools());
    }

    if (state.sonarrConfig) {
      tools.push(...createSonarrTools());
    }

    return { tools };
  });

  state.server.setRequestHandler(
    CallToolRequestSchema,
    async (
      request,
    ): Promise<{ content: Array<{ type: string; text: string }> }> => {
      const { name, arguments: args } = request.params;

      try {
        // Handle Radarr tools
        if (name.startsWith("radarr_")) {
          if (!state.radarrConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Radarr is not configured",
            );
          }
          return await handleRadarrTool(name, args, state.radarrConfig);
        }

        // Handle Sonarr tools
        if (name.startsWith("sonarr_")) {
          if (!state.sonarrConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Sonarr is not configured",
            );
          }
          return await handleSonarrTool(name, args, state.sonarrConfig);
        }

        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  );

  // Error handling
  state.server.onerror = (error) => {
    console.error("[MCP Error]", error);
  };

  process.on("SIGINT", async () => {
    await state.server.close();
  });
}

async function runServer(state: ServerState): Promise<void> {
  // Test connections before starting
  if (state.radarrConfig) {
    try {
      const connected = await testRadarrConnection(state.radarrConfig);
      if (connected) {
        console.error("[INFO] Successfully connected to Radarr");
      } else {
        console.error("[WARNING] Failed to connect to Radarr");
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
      const connected = await testSonarrConnection(state.sonarrConfig);
      if (connected) {
        console.error("[INFO] Successfully connected to Sonarr");
      } else {
        console.error("[WARNING] Failed to connect to Sonarr");
      }
    } catch (error) {
      console.error(
        "[WARNING] Sonarr connection test failed:",
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
    const serverState = createServer();
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
