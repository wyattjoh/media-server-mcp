import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RadarrConfig, RadarrMovie } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";
import { wrapToolHandler } from "./tool-wrapper.ts";

export function createRadarrTools(
  server: McpServer,
  config: Readonly<RadarrConfig>,
  isToolEnabled: (toolName: string) => boolean,
): void {
  // radarr_search_movie
  if (isToolEnabled("radarr_search_movie")) {
    server.registerTool(
      "radarr_search_movie",
      {
        title: "Search for movies in The Movie Database via Radarr",
        description: "Search for movies in The Movie Database via Radarr",
        inputSchema: {
          term: z.string().describe("Movie title to search for"),
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
        },
        outputSchema: {
          data: z.array(z.record(z.string(), z.unknown())),
          total: z.number(),
          returned: z.number(),
          skip: z.number(),
          limit: z.number().optional(),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_search_movie", async (args) => {
        const results = await radarrClient.searchMovie(
          config,
          args.term,
          args.limit,
          args.skip,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
          structuredContent: results as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  // radarr_add_movie
  if (isToolEnabled("radarr_add_movie")) {
    server.registerTool(
      "radarr_add_movie",
      {
        title: "Add a movie to Radarr",
        description: "Add a movie to Radarr",
        inputSchema: {
          tmdbId: z.number().describe("The Movie Database ID"),
          title: z.string().describe("Movie title"),
          year: z.number().describe("Movie release year"),
          qualityProfileId: z.number().describe("Quality profile ID to use"),
          rootFolderPath: z.string().describe(
            "Root folder path where movie should be stored",
          ),
          minimumAvailability: z.enum([
            "tba",
            "announced",
            "inCinemas",
            "released",
            "preDB",
          ]).describe("Minimum availability for monitoring"),
          monitored: z.boolean().optional().default(true).describe(
            "Whether to monitor the movie",
          ),
          searchForMovie: z.boolean().optional().default(true).describe(
            "Whether to search for the movie immediately after adding",
          ),
          tags: z.array(z.number()).optional().describe(
            "Tag IDs to apply to the movie",
          ),
        },
        outputSchema: z.record(z.string(), z.unknown()),
        annotations: { openWorldHint: false },
      },
      wrapToolHandler("radarr_add_movie", async (args) => {
        const params = {
          ...args,
          tags: args.tags || undefined,
          monitored: args.monitored ?? undefined,
          searchForMovie: args.searchForMovie ?? undefined,
        };
        const result = await radarrClient.addMovie(config, params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  // radarr_delete_movie
  if (isToolEnabled("radarr_delete_movie")) {
    server.registerTool(
      "radarr_delete_movie",
      {
        title: "Delete a movie from Radarr",
        description: "Delete a movie from Radarr",
        inputSchema: {
          id: z.number().describe("Movie ID in Radarr"),
          deleteFiles: z.boolean().optional().default(false).describe(
            "Whether to delete movie files",
          ),
          addImportExclusion: z.boolean().optional().default(false).describe(
            "Whether to add import exclusion",
          ),
        },
        outputSchema: { message: z.string() },
        annotations: { destructiveHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_delete_movie", async (args) => {
        await radarrClient.deleteMovie(
          config,
          args.id,
          args.deleteFiles,
          args.addImportExclusion,
        );
        const result = { message: `Movie ${args.id} deleted successfully` };
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

  // radarr_refresh_movie
  if (isToolEnabled("radarr_refresh_movie")) {
    server.registerTool(
      "radarr_refresh_movie",
      {
        title: "Refresh metadata for a specific movie",
        description: "Refresh metadata for a specific movie",
        inputSchema: {
          id: z.number().describe("Movie ID in Radarr"),
        },
        outputSchema: { message: z.string() },
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_refresh_movie", async (args) => {
        await radarrClient.refreshMovie(config, args.id);
        const result = {
          message: `Movie ${args.id} refresh initiated successfully`,
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

  // radarr_search_movie_releases
  if (isToolEnabled("radarr_search_movie_releases")) {
    server.registerTool(
      "radarr_search_movie_releases",
      {
        title: "Search for releases of a specific movie",
        description: "Search for releases of a specific movie",
        inputSchema: {
          id: z.number().describe("Movie ID in Radarr"),
        },
        outputSchema: { message: z.string() },
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_search_movie_releases", async (args) => {
        await radarrClient.searchMovieReleases(config, args.id);
        const result = {
          message:
            `Search for movie ${args.id} releases initiated successfully`,
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

  // radarr_get_movies
  if (isToolEnabled("radarr_get_movies")) {
    server.registerTool(
      "radarr_get_movies",
      {
        title: "Get all movies in the Radarr library",
        description: "Get all movies in the Radarr library",
        inputSchema: {
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
          filters: z.object({
            title: z.string().optional().describe(
              "Filter by title (partial match, case-insensitive)",
            ),
            genres: z.array(z.string()).optional().describe(
              "Filter by genres (matches any)",
            ),
            yearFrom: z.number().optional().describe(
              "Filter by minimum year",
            ),
            yearTo: z.number().optional().describe(
              "Filter by maximum year",
            ),
            tmdbId: z.number().optional().describe(
              "Filter by TMDB ID",
            ),
            imdbId: z.string().optional().describe(
              "Filter by IMDB ID",
            ),
            monitored: z.boolean().optional().describe(
              "Filter by monitored status",
            ),
            hasFile: z.boolean().optional().describe(
              "Filter by file availability",
            ),
            qualityProfileId: z.number().optional().describe(
              "Filter by quality profile ID",
            ),
            minimumAvailability: z.string().optional().describe(
              "Filter by minimum availability status",
            ),
            tags: z.array(z.number()).optional().describe(
              "Filter by tag IDs (matches any)",
            ),
          }).optional().describe("Filter options for movies"),
          sort: z.object({
            field: z.enum([
              "title",
              "year",
              "added",
              "sizeOnDisk",
              "qualityProfileId",
              "runtime",
            ]).describe("Field to sort by"),
            direction: z.enum(["asc", "desc"]).describe("Sort direction"),
          }).optional().describe("Sort options for movies"),
        },
        outputSchema: {
          data: z.array(z.record(z.string(), z.unknown())),
          total: z.number(),
          returned: z.number(),
          skip: z.number(),
          limit: z.number().optional(),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_get_movies", async (args) => {
        const results = await radarrClient.getMovies(
          config,
          args.limit,
          args.skip,
          args.filters,
          args.sort,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
          structuredContent: results as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  // radarr_get_movie
  if (isToolEnabled("radarr_get_movie")) {
    server.registerTool(
      "radarr_get_movie",
      {
        title: "Get details of a specific movie by Radarr ID or TMDB ID",
        description: "Get details of a specific movie by Radarr ID or TMDB ID",
        inputSchema: {
          id: z.number().optional().describe("Movie ID in Radarr"),
          tmdbId: z.number().optional().describe(
            "The Movie Database (TMDB) ID",
          ),
        },
        outputSchema: z.record(z.string(), z.unknown()),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_get_movie", async (args) => {
        // Validate that exactly one identifier is provided
        if ((args.id === undefined) === (args.tmdbId === undefined)) {
          return {
            content: [{
              type: "text",
              text:
                "Error: Provide either 'id' (Radarr ID) or 'tmdbId', but not both",
            }],
          };
        }

        let result;
        if (args.id !== undefined) {
          // Use Radarr ID
          result = await radarrClient.getMovie(config, args.id);
        } else if (args.tmdbId !== undefined) {
          // Use TMDB ID
          result = await radarrClient.getMovie(config, {
            tmdbId: args.tmdbId,
          });
        }

        if (!result) {
          return {
            content: [{
              type: "text",
              text: `Movie not found with ${
                args.id !== undefined
                  ? `Radarr ID ${args.id}`
                  : `TMDB ID ${args.tmdbId}`
              }`,
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  // radarr_get_configuration
  if (isToolEnabled("radarr_get_configuration")) {
    server.registerTool(
      "radarr_get_configuration",
      {
        title:
          "Get Radarr configuration including quality profiles, and root folders",
        description:
          "Get Radarr configuration including quality profiles, and root folders",
        inputSchema: {},
        outputSchema: {
          qualityProfiles: z.array(z.record(z.string(), z.unknown())),
          rootFolders: z.array(z.record(z.string(), z.unknown())),
        },
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_get_configuration", async () => {
        const [qualityProfiles, rootFolders] = await Promise.all([
          radarrClient.getQualityProfiles(config),
          radarrClient.getRootFolders(config),
        ]);
        const result = {
          qualityProfiles: qualityProfiles as unknown as Record<
            string,
            unknown
          >[],
          rootFolders: rootFolders as unknown as Record<string, unknown>[],
        };
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

  // radarr_update_movie
  if (isToolEnabled("radarr_update_movie")) {
    server.registerTool(
      "radarr_update_movie",
      {
        title: "Update a movie's settings (quality profile, monitoring, etc.)",
        description:
          "Update a movie's settings (quality profile, monitoring, etc.)",
        inputSchema: {
          id: z.number().describe("Movie ID to update"),
          monitored: z.boolean().optional().describe(
            "Whether to monitor the movie",
          ),
          qualityProfileId: z.number().optional().describe(
            "Quality profile ID",
          ),
          minimumAvailability: z.enum([
            "tba",
            "announced",
            "inCinemas",
            "released",
            "preDB",
          ]).optional().describe("Minimum availability for monitoring"),
          tags: z.array(z.number()).optional().describe("Tag IDs"),
        },
        outputSchema: z.record(z.string(), z.unknown()),
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_update_movie", async (args) => {
        // First get the current movie data
        const currentMovie = await radarrClient.getMovie(config, args.id);

        // Update only the specified fields
        const updatedMovie = {
          ...currentMovie,
          ...(args.monitored !== undefined &&
            { monitored: args.monitored }),
          ...(args.qualityProfileId !== undefined &&
            { qualityProfileId: args.qualityProfileId }),
          ...(args.minimumAvailability !== undefined &&
            { minimumAvailability: args.minimumAvailability }),
          ...(args.tags !== undefined && { tags: args.tags }),
        } as RadarrMovie;

        const result = await radarrClient.updateMovie(config, updatedMovie);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      }),
    );
  }

  // radarr_refresh_all_movies
  if (isToolEnabled("radarr_refresh_all_movies")) {
    server.registerTool(
      "radarr_refresh_all_movies",
      {
        title: "Refresh metadata for all movies in the library",
        description: "Refresh metadata for all movies in the library",
        inputSchema: {},
        outputSchema: { message: z.string() },
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_refresh_all_movies", async () => {
        await radarrClient.refreshAllMovies(config);
        const result = { message: "Refresh all movies initiated successfully" };
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

  // radarr_disk_scan
  if (isToolEnabled("radarr_disk_scan")) {
    server.registerTool(
      "radarr_disk_scan",
      {
        title: "Rescan all movie folders for new/missing files",
        description: "Rescan all movie folders for new/missing files",
        inputSchema: {},
        outputSchema: { message: z.string() },
        annotations: { idempotentHint: true, openWorldHint: false },
      },
      wrapToolHandler("radarr_disk_scan", async () => {
        await radarrClient.diskScan(config);
        const result = { message: "Disk scan initiated successfully" };
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
