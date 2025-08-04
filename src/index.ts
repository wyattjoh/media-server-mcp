#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run --allow-net

import "@std/dotenv/load";
import process from "node:process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
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
import {
  createIMDBConfig,
  testConnection as testIMDBConnection,
} from "./clients/imdb.ts";
import type { RadarrConfig } from "./clients/radarr.ts";
import type { SonarrConfig } from "./clients/sonarr.ts";
import type { IMDBConfig } from "./clients/imdb.ts";
import { createRadarrTools, handleRadarrTool } from "./tools/radarr-tools.ts";
import { createSonarrTools, handleSonarrTool } from "./tools/sonarr-tools.ts";
import { createIMDBTools, handleIMDBTool } from "./tools/imdb-tools.ts";
import {
  createRadarrResources,
  handleRadarrResource,
} from "./resources/radarr-resources.ts";
import {
  createSonarrResources,
  handleSonarrResource,
} from "./resources/sonarr-resources.ts";
import {
  createIMDBResources,
  handleIMDBResource,
} from "./resources/imdb-resources.ts";

interface ServerState {
  server: Server;
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  imdbConfig?: IMDBConfig;
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
        resources: {
          subscribe: true,
          listChanged: true,
        },
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

  // Load IMDB configuration
  const imdbUrl = Deno.env.get("IMDB_URL");
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
  if (imdbUrl && rapidApiKey) {
    state.imdbConfig = createIMDBConfig(imdbUrl, rapidApiKey);
  }

  if (!state.radarrConfig && !state.sonarrConfig && !state.imdbConfig) {
    throw new Error(
      "At least one service must be configured. Please set RADARR_URL/RADARR_API_KEY, SONARR_URL/SONARR_API_KEY, or IMDB_URL/RAPIDAPI_KEY environment variables.",
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

    if (state.imdbConfig) {
      tools.push(...createIMDBTools());
    }

    return { tools };
  });

  state.server.setRequestHandler(ListResourcesRequestSchema, () => {
    const resources = [];

    if (state.radarrConfig) {
      resources.push(...createRadarrResources());
    }

    if (state.sonarrConfig) {
      resources.push(...createSonarrResources());
    }

    if (state.imdbConfig) {
      resources.push(...createIMDBResources());
    }

    return { resources };
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

        // Handle IMDB tools
        if (name.startsWith("imdb_")) {
          if (!state.imdbConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "IMDB is not configured",
            );
          }
          return await handleIMDBTool(name, args, state.imdbConfig);
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

  state.server.setRequestHandler(
    ReadResourceRequestSchema,
    async (
      request,
    ): Promise<
      {
        contents: Array<
          {
            uri: string;
            mimeType?: string | undefined;
            text?: string | undefined;
          }
        >;
      }
    > => {
      const { uri } = request.params;

      try {
        // Handle Radarr resources
        if (uri.startsWith("radarr://")) {
          if (!state.radarrConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Radarr is not configured",
            );
          }
          const result = await handleRadarrResource(uri, state.radarrConfig);
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: result.content[0]?.text,
            }],
          };
        }

        // Handle Sonarr resources
        if (uri.startsWith("sonarr://")) {
          if (!state.sonarrConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "Sonarr is not configured",
            );
          }
          const result = await handleSonarrResource(uri, state.sonarrConfig);
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: result.content[0]?.text,
            }],
          };
        }

        // Handle IMDB resources
        if (uri.startsWith("imdb://")) {
          if (!state.imdbConfig) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "IMDB is not configured",
            );
          }
          const result = await handleIMDBResource(uri, state.imdbConfig);
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: result.content[0]?.text,
            }],
          };
        }

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource: ${uri}`,
        );
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${
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

  if (state.imdbConfig) {
    try {
      const result = await testIMDBConnection(state.imdbConfig);
      if (result.success) {
        console.error("[INFO] Successfully connected to IMDB");
      } else {
        console.error("[WARNING] Failed to connect to IMDB:", result.error);
      }
    } catch (error) {
      console.error(
        "[WARNING] IMDB connection test failed:",
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
