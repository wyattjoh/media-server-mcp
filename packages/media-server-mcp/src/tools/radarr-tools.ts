import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RadarrConfig, RadarrMovie } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

export function createRadarrTools(
  server: McpServer,
  config: RadarrConfig,
): void {
  // radarr_search_movie
  server.tool(
    "radarr_search_movie",
    "Search for movies in The Movie Database via Radarr",
    {
      term: z.string().describe("Movie title to search for"),
      limit: z.number().optional().describe(
        "Maximum number of results to return",
      ),
      skip: z.number().optional().describe(
        "Number of results to skip (for pagination)",
      ),
    },
    async (args) => {
      try {
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

  // radarr_add_movie
  server.tool(
    "radarr_add_movie",
    "Add a movie to Radarr",
    {
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
    async (args) => {
      try {
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

  // radarr_delete_movie
  server.tool(
    "radarr_delete_movie",
    "Delete a movie from Radarr",
    {
      id: z.number().describe("Movie ID in Radarr"),
      deleteFiles: z.boolean().optional().default(false).describe(
        "Whether to delete movie files",
      ),
      addImportExclusion: z.boolean().optional().default(false).describe(
        "Whether to add import exclusion",
      ),
    },
    async (args) => {
      try {
        await radarrClient.deleteMovie(
          config,
          args.id,
          args.deleteFiles,
          args.addImportExclusion,
        );
        return {
          content: [{
            type: "text",
            text: `Movie ${args.id} deleted successfully`,
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

  // radarr_refresh_movie
  server.tool(
    "radarr_refresh_movie",
    "Refresh metadata for a specific movie",
    {
      id: z.number().describe("Movie ID in Radarr"),
    },
    async (args) => {
      try {
        await radarrClient.refreshMovie(config, args.id);
        return {
          content: [{
            type: "text",
            text: `Movie ${args.id} refresh initiated successfully`,
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

  // radarr_search_movie_releases
  server.tool(
    "radarr_search_movie_releases",
    "Search for releases of a specific movie",
    {
      id: z.number().describe("Movie ID in Radarr"),
    },
    async (args) => {
      try {
        await radarrClient.searchMovieReleases(config, args.id);
        return {
          content: [{
            type: "text",
            text: `Search for movie ${args.id} releases initiated successfully`,
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

  // radarr_get_movies
  server.tool(
    "radarr_get_movies",
    "Get all movies in the Radarr library",
    {
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
    async (args) => {
      try {
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

  // radarr_get_movie
  server.tool(
    "radarr_get_movie",
    "Get details of a specific movie",
    {
      id: z.number().describe("Movie ID in Radarr"),
    },
    async (args) => {
      try {
        const result = await radarrClient.getMovie(config, args.id);
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

  // radarr_get_configuration
  server.tool(
    "radarr_get_configuration",
    "Get Radarr configuration including quality profiles, and root folders",
    {},
    async () => {
      try {
        const [qualityProfiles, rootFolders] = await Promise.all([
          radarrClient.getQualityProfiles(config),
          radarrClient.getRootFolders(config),
        ]);
        const result = {
          qualityProfiles,
          rootFolders,
        };
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

  // radarr_update_movie
  server.tool(
    "radarr_update_movie",
    "Update a movie's settings (quality profile, monitoring, etc.)",
    {
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
    async (args) => {
      try {
        // First get the current movie data
        const currentMovie = await radarrClient.getMovie(config, args.id);

        // Update only the specified fields
        const updatedMovie: RadarrMovie = {
          ...currentMovie,
          ...(args.monitored !== undefined &&
            { monitored: args.monitored }),
          ...(args.qualityProfileId !== undefined &&
            { qualityProfileId: args.qualityProfileId }),
          ...(args.minimumAvailability !== undefined &&
            { minimumAvailability: args.minimumAvailability }),
          ...(args.tags !== undefined && { tags: args.tags }),
        };

        const result = await radarrClient.updateMovie(config, updatedMovie);
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

  // radarr_refresh_all_movies
  server.tool(
    "radarr_refresh_all_movies",
    "Refresh metadata for all movies in the library",
    {},
    async () => {
      try {
        await radarrClient.refreshAllMovies(config);
        return {
          content: [{
            type: "text",
            text: "Refresh all movies initiated successfully",
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

  // radarr_disk_scan
  server.tool(
    "radarr_disk_scan",
    "Rescan all movie folders for new/missing files",
    {},
    async () => {
      try {
        await radarrClient.diskScan(config);
        return {
          content: [{
            type: "text",
            text: "Disk scan initiated successfully",
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
