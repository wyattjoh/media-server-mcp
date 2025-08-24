import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlexConfig } from "@wyattjoh/plex";
import * as plexClient from "@wyattjoh/plex";
import { SearchType } from "@wyattjoh/plex";

export function createPlexTools(
  server: McpServer,
  config: Readonly<PlexConfig>,
  isToolEnabled: (toolName: string) => boolean,
): void {
  // plex_get_capabilities
  if (isToolEnabled("plex_get_capabilities")) {
    server.registerTool(
      "plex_get_capabilities",
      {
        title: "Get Plex server capabilities and information",
        description:
          "Get Plex server capabilities, version, and system information",
        inputSchema: {},
      },
      async () => {
        try {
          const result = await plexClient.getCapabilities(config);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // plex_get_libraries
  if (isToolEnabled("plex_get_libraries")) {
    server.registerTool(
      "plex_get_libraries",
      {
        title: "Get Plex media libraries",
        description: "List all media libraries available on the Plex server",
        inputSchema: {},
      },
      async () => {
        try {
          const result = await plexClient.getLibraries(config);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // plex_search
  if (isToolEnabled("plex_search")) {
    server.registerTool(
      "plex_search",
      {
        title: "Search Plex media library",
        description:
          "Search across all Plex libraries for movies, TV shows, and other content",
        inputSchema: {
          query: z.string().describe("Search query term"),
          limit: z.number().optional().default(100).describe(
            "Maximum number of results to return (default: 100)",
          ),
          searchTypes: z.array(
            z.nativeEnum(SearchType),
          ).optional().describe(
            "Filter by content types. If not provided, searches all types",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.search(
            config,
            args.query,
            args.limit,
            args.searchTypes,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // plex_get_metadata
  if (isToolEnabled("plex_get_metadata")) {
    server.registerTool(
      "plex_get_metadata",
      {
        title: "Get detailed metadata for a Plex item",
        description:
          "Get detailed metadata for a specific movie, TV show, or other media item",
        inputSchema: {
          ratingKey: z.string().describe(
            "The rating key (unique identifier) of the media item",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.getMetadata(config, args.ratingKey);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // plex_refresh_library
  if (isToolEnabled("plex_refresh_library")) {
    server.registerTool(
      "plex_refresh_library",
      {
        title: "Refresh a Plex library",
        description:
          "Trigger a refresh of a specific Plex library to scan for new content",
        inputSchema: {
          key: z.string().describe(
            "The library key (section ID) to refresh",
          ),
        },
      },
      async (args) => {
        try {
          await plexClient.refreshLibrary(config, args.key);
          return {
            content: [{
              type: "text",
              text: `Library refresh initiated for section ${args.key}`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }
}
