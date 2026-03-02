import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PlexConfig } from "@wyattjoh/plex";
import * as plexClient from "@wyattjoh/plex";
import { SearchType } from "@wyattjoh/plex";

const SLIM_OMIT_KEYS = new Set([
  "Media",
  "Image",
  "UltraBlurColors",
  "Stream",
  "Part",
  "Writer",
]);
const slimReplacer = (key: string, value: unknown) =>
  SLIM_OMIT_KEYS.has(key) ? undefined : value;

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

  // plex_get_library_items
  if (isToolEnabled("plex_get_library_items")) {
    server.registerTool(
      "plex_get_library_items",
      {
        title: "Browse items in a Plex library",
        description:
          "Browse and filter items in a Plex library section. Supports filtering by studio, genre, year, and more.",
        inputSchema: {
          key: z.string().describe("The library section key/ID"),
          type: z.number().optional().describe(
            "Media type filter (1=movie, 2=show, 3=season, 4=episode)",
          ),
          studio: z.string().optional().describe(
            "Filter by studio name (e.g., 'Studio Ghibli')",
          ),
          genre: z.string().optional().describe(
            "Filter by genre (e.g., 'Action')",
          ),
          year: z.number().optional().describe(
            "Filter by release year",
          ),
          sort: z.string().optional().describe(
            "Sort field (e.g., 'titleSort', 'year', 'addedAt')",
          ),
          start: z.number().optional().describe(
            "Pagination offset (0-based)",
          ),
          size: z.number().optional().default(200).describe(
            "Number of items per page (default: 200). Use start for pagination.",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.getLibraryItems(config, args.key, {
            type: args.type,
            studio: args.studio,
            genre: args.genre,
            year: args.year,
            sort: args.sort,
            start: args.start,
            size: args.size,
          });
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, slimReplacer, 2),
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

  // plex_get_collections
  if (isToolEnabled("plex_get_collections")) {
    server.registerTool(
      "plex_get_collections",
      {
        title: "List Plex collections",
        description: "List all collections in a Plex library section",
        inputSchema: {
          key: z.string().describe("The library section key/ID"),
          start: z.number().optional().describe(
            "Pagination offset (0-based)",
          ),
          size: z.number().optional().default(100).describe(
            "Number of collections per page (default: 100). Use start for pagination.",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.getCollections(config, args.key, {
            ...(args.start !== undefined && { start: args.start }),
            size: args.size,
          });
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, slimReplacer, 2),
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

  // plex_get_collection_items
  if (isToolEnabled("plex_get_collection_items")) {
    server.registerTool(
      "plex_get_collection_items",
      {
        title: "Get items in a Plex collection",
        description: "Get all items in a specific Plex collection",
        inputSchema: {
          collectionId: z.string().describe(
            "The collection rating key/ID",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.getCollectionItems(
            config,
            args.collectionId,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, slimReplacer, 2),
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

  // plex_create_collection
  if (isToolEnabled("plex_create_collection")) {
    server.registerTool(
      "plex_create_collection",
      {
        title: "Create a Plex collection",
        description:
          "Create a new collection in a Plex library with initial items",
        inputSchema: {
          sectionKey: z.string().describe("The library section key/ID"),
          title: z.string().describe("The collection title"),
          ratingKeys: z.array(z.string()).describe(
            "Rating keys of items to add to the collection",
          ),
        },
      },
      async (args) => {
        try {
          const result = await plexClient.createCollection(
            config,
            args.sectionKey,
            args.title,
            args.ratingKeys,
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

  // plex_add_to_collection
  if (isToolEnabled("plex_add_to_collection")) {
    server.registerTool(
      "plex_add_to_collection",
      {
        title: "Add items to a Plex collection",
        description: "Add one or more items to an existing Plex collection",
        inputSchema: {
          collectionId: z.string().describe(
            "The collection rating key/ID",
          ),
          ratingKeys: z.array(z.string()).describe(
            "Rating keys of items to add to the collection",
          ),
        },
      },
      async (args) => {
        try {
          await plexClient.addToCollection(
            config,
            args.collectionId,
            args.ratingKeys,
          );
          return {
            content: [{
              type: "text",
              text:
                `Successfully added ${args.ratingKeys.length} item(s) to collection ${args.collectionId}`,
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

  // plex_remove_from_collection
  if (isToolEnabled("plex_remove_from_collection")) {
    server.registerTool(
      "plex_remove_from_collection",
      {
        title: "Remove items from a Plex collection",
        description: "Remove one or more items from a Plex collection",
        inputSchema: {
          collectionId: z.string().describe(
            "The collection rating key/ID",
          ),
          ratingKeys: z.array(z.string()).describe(
            "Rating keys of items to remove",
          ),
        },
      },
      async (args) => {
        try {
          for (const ratingKey of args.ratingKeys) {
            await plexClient.removeFromCollection(
              config,
              args.collectionId,
              ratingKey,
            );
          }
          return {
            content: [{
              type: "text",
              text:
                `Removed ${args.ratingKeys.length} item(s) from collection ${args.collectionId}`,
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

  // plex_delete_collection
  if (isToolEnabled("plex_delete_collection")) {
    server.registerTool(
      "plex_delete_collection",
      {
        title: "Delete a Plex collection",
        description: "Delete an entire collection from a Plex library",
        inputSchema: {
          collectionId: z.string().describe(
            "The collection rating key/ID to delete",
          ),
        },
      },
      async (args) => {
        try {
          await plexClient.deleteCollection(config, args.collectionId);
          return {
            content: [{
              type: "text",
              text: `Successfully deleted collection ${args.collectionId}`,
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
