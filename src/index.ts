#!/usr/bin/env -S deno run --allow-all

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
import { RadarrClient } from "./clients/radarr.ts";
import { SonarrClient } from "./clients/sonarr.ts";
import { createRadarrTools, handleRadarrTool } from "./tools/radarr-tools.ts";
import { createSonarrTools, handleSonarrTool } from "./tools/sonarr-tools.ts";

class MediaServerMCPServer {
  private server: Server;
  private radarrClient?: RadarrClient;
  private sonarrClient?: SonarrClient;

  constructor() {
    this.server = new Server(
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

    this.loadConfig();
    this.setupHandlers();
  }

  private loadConfig(): void {
    // Load Radarr configuration
    const radarrUrl = Deno.env.get("RADARR_URL");
    const radarrApiKey = Deno.env.get("RADARR_API_KEY");
    if (radarrUrl && radarrApiKey) {
      this.radarrClient = new RadarrClient(radarrUrl, radarrApiKey);
    }

    // Load Sonarr configuration
    const sonarrUrl = Deno.env.get("SONARR_URL");
    const sonarrApiKey = Deno.env.get("SONARR_API_KEY");
    if (sonarrUrl && sonarrApiKey) {
      this.sonarrClient = new SonarrClient(sonarrUrl, sonarrApiKey);
    }

    if (!this.radarrClient && !this.sonarrClient) {
      throw new Error(
        "At least one of Radarr or Sonarr must be configured. Please set RADARR_URL/RADARR_API_KEY or SONARR_URL/SONARR_API_KEY environment variables.",
      );
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools = [];

      if (this.radarrClient) {
        tools.push(...createRadarrTools());
      }

      if (this.sonarrClient) {
        tools.push(...createSonarrTools());
      }

      return { tools };
    });

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (
        request,
      ): Promise<{ content: Array<{ type: string; text: string }> }> => {
        const { name, arguments: args } = request.params;

        try {
          // Handle Radarr tools
          if (name.startsWith("radarr_")) {
            if (!this.radarrClient) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                "Radarr is not configured",
              );
            }
            return await handleRadarrTool(name, args, this.radarrClient);
          }

          // Handle Sonarr tools
          if (name.startsWith("sonarr_")) {
            if (!this.sonarrClient) {
              throw new McpError(
                ErrorCode.InvalidRequest,
                "Sonarr is not configured",
              );
            }
            return await handleSonarrTool(name, args, this.sonarrClient);
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
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
    });
  }

  async run(): Promise<void> {
    // Test connections before starting
    if (this.radarrClient) {
      try {
        const connected = await this.radarrClient.testConnection();
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

    if (this.sonarrClient) {
      try {
        const connected = await this.sonarrClient.testConnection();
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
    await this.server.connect(transport);
    console.error("[INFO] Media Server MCP Server running on stdio");
  }
}

async function main(): Promise<void> {
  try {
    const server = new MediaServerMCPServer();
    await server.run();
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
