import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type PlexConfig, SearchType } from "@wyattjoh/plex";
import * as plexClient from "@wyattjoh/plex";
import { withStrictInputSchemas, wrapToolHandler } from "./tool-wrapper.ts";

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

function compactLibraryItems(
  result: Awaited<ReturnType<typeof plexClient.getLibraryItems>>,
): Record<string, unknown> {
  const container = result.MediaContainer;
  return {
    MediaContainer: {
      size: container.size,
      ...(container.totalSize !== undefined && {
        totalSize: container.totalSize,
      }),
      ...(container.offset !== undefined && { offset: container.offset }),
      identifier: container.identifier,
      librarySectionID: container.librarySectionID,
      librarySectionTitle: container.librarySectionTitle,
      librarySectionUUID: container.librarySectionUUID,
      ...(container.Metadata !== undefined && {
        Metadata: container.Metadata.map((item) => ({
          ratingKey: item.ratingKey,
          type: item.type,
          title: item.title,
          year: item.year,
          ...(item.viewCount !== undefined && { viewCount: item.viewCount }),
          ...(item.lastViewedAt !== undefined && {
            lastViewedAt: item.lastViewedAt,
          }),
          ...(item.grandparentTitle !== undefined && {
            grandparentTitle: item.grandparentTitle,
          }),
          ...(item.parentTitle !== undefined && {
            parentTitle: item.parentTitle,
          }),
          ...(item.parentIndex !== undefined && {
            parentIndex: item.parentIndex,
          }),
          ...(item.index !== undefined && { index: item.index }),
        })),
      }),
    },
  };
}

const PlexMediaIdentitySchema = z.object({
  ratingKey: z.string(),
  type: z.string(),
  title: z.string(),
}).catchall(z.unknown());

const PlexCollectionIdentitySchema = PlexMediaIdentitySchema.extend({
  subtype: z.string(),
}).catchall(z.unknown());

const PlexCapabilitiesOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    friendlyName: z.string(),
    machineIdentifier: z.string(),
    version: z.string(),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

const PlexLibrariesOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    title1: z.string(),
    Directory: z.array(
      z.object({
        key: z.string(),
        type: z.string(),
        title: z.string(),
      }).catchall(z.unknown()),
    ),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

const PlexSearchOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    identifier: z.string().optional(),
    Hub: z.array(
      z.object({
        size: z.number(),
        title: z.string(),
        type: z.string(),
        Metadata: z.array(PlexMediaIdentitySchema).optional(),
      }).catchall(z.unknown()),
    ),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

const PlexMetadataOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    identifier: z.string(),
    librarySectionID: z.number(),
    librarySectionTitle: z.string(),
    librarySectionUUID: z.string(),
    Metadata: z.array(PlexMediaIdentitySchema),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

const PlexLibraryItemsOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    totalSize: z.number().optional(),
    offset: z.number().optional(),
    identifier: z.string(),
    librarySectionID: z.number(),
    librarySectionTitle: z.string(),
    librarySectionUUID: z.string(),
    Metadata: z.array(PlexMediaIdentitySchema).optional(),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

const PlexCollectionsOutputSchema = z.object({
  MediaContainer: z.object({
    size: z.number(),
    totalSize: z.number().optional(),
    offset: z.number().optional(),
    identifier: z.string(),
    librarySectionID: z.number(),
    librarySectionTitle: z.string(),
    librarySectionUUID: z.string(),
    Metadata: z.array(PlexCollectionIdentitySchema).optional(),
  }).catchall(z.unknown()),
}).catchall(z.unknown());

/**
 * Registers Plex tools and their stable MCP input and output contracts.
 *
 * @param server MCP server receiving the Plex tool registrations.
 * @param config Plex connection configuration captured by tool handlers.
 * @param isToolEnabled Predicate controlling which Plex tools are registered.
 */
export function createPlexTools(
  server: McpServer,
  config: Readonly<PlexConfig>,
  isToolEnabled: (toolName: string) => boolean,
): void {
  server = withStrictInputSchemas(server);
  // plex_get_capabilities
  if (isToolEnabled("plex_get_capabilities")) {
    server.registerTool(
      "plex_get_capabilities",
      {
        title: "Get Plex server capabilities and information",
        description:
          "Get Plex server capabilities, version, and system information",
        inputSchema: {},
        outputSchema: PlexCapabilitiesOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_capabilities", async () => {
        const result = await plexClient.getCapabilities(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: PlexLibrariesOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_libraries", async () => {
        const result = await plexClient.getLibraries(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
    );
  }

  // plex_get_accounts
  if (isToolEnabled("plex_get_accounts")) {
    server.registerTool(
      "plex_get_accounts",
      {
        title: "Get Plex system accounts",
        description:
          "List Plex system accounts and their IDs and names for resolving playback-history account IDs",
        inputSchema: {},
        outputSchema: z.object({}).catchall(z.unknown()),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_accounts", async () => {
        const result = await plexClient.getAccounts(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
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
          searchTypes: z.array(z.enum(SearchType)).optional().describe(
            "Filter by content types. If not provided, searches all types",
          ),
        },
        outputSchema: PlexSearchOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_search", async (args) => {
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
          structuredContent: result,
        };
      }),
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
        outputSchema: PlexMetadataOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_metadata", async (args) => {
        const result = await plexClient.getMetadata(config, args.ratingKey);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
    );
  }

  // plex_get_playback_history
  if (isToolEnabled("plex_get_playback_history")) {
    server.registerTool(
      "plex_get_playback_history",
      {
        title: "Get Plex playback history",
        description:
          "Get playback history for a specific playable Plex media item by rating key",
        inputSchema: {
          ratingKey: z.string().describe(
            "The Plex rating key for a playable media item, such as a movie or episode",
          ),
          accountId: z.number().int().optional().describe(
            "Filter history to a specific Plex account ID",
          ),
          start: z.number().int().min(0).optional().describe(
            "Pagination offset (0-based)",
          ),
          size: z.number().int().min(1).max(1_000).optional().default(100)
            .describe(
              "Number of history entries to return (default: 100, maximum: 1,000)",
            ),
          viewedAtSince: z.number().int().min(0).optional().describe(
            "Only return plays after this Unix timestamp",
          ),
        },
        outputSchema: z.object({}).catchall(z.unknown()),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_playback_history", async (args) => {
        const result = await plexClient.getPlaybackHistory(
          config,
          args.ratingKey,
          {
            accountId: args.accountId,
            start: args.start,
            size: args.size,
            viewedAtSince: args.viewedAtSince,
          },
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
    );
  }

  // plex_get_watch_history
  if (isToolEnabled("plex_get_watch_history")) {
    server.registerTool(
      "plex_get_watch_history",
      {
        title: "Get global Plex watch history",
        description:
          "Get recent playback history across all playable Plex media items; combine accountID values with plex_get_accounts to resolve viewer names",
        inputSchema: {
          accountId: z.number().int().optional().describe(
            "Filter history to a specific Plex account ID",
          ),
          start: z.number().int().min(0).optional().describe(
            "Pagination offset (0-based)",
          ),
          size: z.number().int().min(1).max(1_000).optional().default(100)
            .describe(
              "Number of history entries to return (default: 100, maximum: 1,000)",
            ),
          viewedAtSince: z.number().int().min(0).optional().describe(
            "Only return plays after this Unix timestamp",
          ),
        },
        outputSchema: z.object({}).catchall(z.unknown()),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_watch_history", async (args) => {
        const result = await plexClient.getWatchHistory(config, {
          accountId: args.accountId,
          start: args.start,
          size: args.size,
          viewedAtSince: args.viewedAtSince,
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: { message: z.string() },
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_refresh_library", async (args) => {
        await plexClient.refreshLibrary(config, args.key);
        const result = {
          message: `Library refresh initiated for section ${args.key}`,
        };
        return {
          content: [{
            type: "text",
            text: result.message,
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: PlexLibraryItemsOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_library_items", async (args) => {
        const result = compactLibraryItems(
          await plexClient.getLibraryItems(config, args.key, {
            type: args.type,
            studio: args.studio,
            genre: args.genre,
            year: args.year,
            sort: args.sort,
            start: args.start,
            size: args.size,
          }),
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: PlexCollectionsOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_collections", async (args) => {
        const result = await plexClient.getCollections(config, args.key, {
          ...(args.start !== undefined && { start: args.start }),
          size: args.size,
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, slimReplacer, 2),
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: PlexLibraryItemsOutputSchema,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_get_collection_items", async (args) => {
        const result = await plexClient.getCollectionItems(
          config,
          args.collectionId,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, slimReplacer, 2),
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: z.object({}).catchall(z.unknown()),
        annotations: { openWorldHint: false },
      },
      wrapToolHandler("plex_create_collection", async (args) => {
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
          structuredContent: result,
        };
      }),
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
        outputSchema: { message: z.string() },
        annotations: { openWorldHint: false },
      },
      wrapToolHandler("plex_add_to_collection", async (args) => {
        await plexClient.addToCollection(
          config,
          args.collectionId,
          args.ratingKeys,
        );
        const result = {
          message:
            `Successfully added ${args.ratingKeys.length} item(s) to collection ${args.collectionId}`,
        };
        return {
          content: [{
            type: "text",
            text: result.message,
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: { message: z.string() },
        annotations: { destructiveHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_remove_from_collection", async (args) => {
        for (const ratingKey of args.ratingKeys) {
          await plexClient.removeFromCollection(
            config,
            args.collectionId,
            ratingKey,
          );
        }
        const result = {
          message:
            `Removed ${args.ratingKeys.length} item(s) from collection ${args.collectionId}`,
        };
        return {
          content: [{
            type: "text",
            text: result.message,
          }],
          structuredContent: result,
        };
      }),
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
        outputSchema: { message: z.string() },
        annotations: { destructiveHint: true, openWorldHint: false },
      },
      wrapToolHandler("plex_delete_collection", async (args) => {
        await plexClient.deleteCollection(config, args.collectionId);
        const result = {
          message: `Successfully deleted collection ${args.collectionId}`,
        };
        return {
          content: [{
            type: "text",
            text: result.message,
          }],
          structuredContent: result,
        };
      }),
    );
  }
}
