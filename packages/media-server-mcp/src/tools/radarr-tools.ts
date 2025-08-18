import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RadarrConfig, RadarrMovie } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

// Common pagination schema
const PaginationSchema = z.object({
  limit: z.number().optional().describe(
    "Maximum number of results to return",
  ),
  skip: z.number().optional().describe(
    "Number of results to skip (for pagination)",
  ),
});

// Radarr tool schemas
const RadarrSearchSchema = z.object({
  term: z.string().describe("Movie title to search for"),
}).merge(PaginationSchema);

const RadarrAddMovieSchema = z.object({
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
  ])
    .describe("Minimum availability for monitoring"),
  monitored: z.boolean().optional().default(true).describe(
    "Whether to monitor the movie",
  ),
  searchForMovie: z.boolean().optional().default(true)
    .describe("Whether to search for the movie immediately after adding"),
  tags: z.array(z.number()).optional().describe(
    "Tag IDs to apply to the movie",
  ),
});

const RadarrMovieIdSchema = z.object({
  id: z.number().describe("Movie ID in Radarr"),
});

const RadarrMovieFiltersSchema = z.object({
  title: z.string().optional(),
  genres: z.array(z.string()).optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  monitored: z.boolean().optional(),
  hasFile: z.boolean().optional(),
  qualityProfileId: z.number().optional(),
  tags: z.array(z.number()).optional(),
  minimumAvailability: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.number().optional(),
});

const RadarrMovieSortSchema = z.object({
  field: z.enum([
    "title",
    "year",
    "added",
    "sizeOnDisk",
    "qualityProfileId",
    "runtime",
  ]),
  direction: z.enum(["asc", "desc"]),
});

const RadarrUpdateMovieSchema = z.object({
  id: z.number().describe("Movie ID in Radarr"),
  monitored: z.boolean().optional().describe("Whether to monitor the movie"),
  qualityProfileId: z.number().optional().describe("Quality profile ID to use"),
  minimumAvailability: z.enum([
    "tba",
    "announced",
    "inCinemas",
    "released",
    "preDB",
  ]).optional().describe("Minimum availability for monitoring"),
  tags: z.array(z.number()).optional().describe(
    "Tag IDs to apply to the movie",
  ),
});

export function createRadarrTools(
  server: McpServer,
  config: RadarrConfig,
): void {
  // radarr_search_movie
  server.tool(
    "radarr_search_movie",
    "Search for movies in The Movie Database via Radarr",
    RadarrSearchSchema.shape,
    async (args) => {
      try {
        const parsed = RadarrSearchSchema.parse(args);
        const results = await radarrClient.searchMovie(
          config,
          parsed.term,
          parsed.limit,
          parsed.skip,
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
    RadarrAddMovieSchema.shape,
    async (args) => {
      try {
        const parsed = RadarrAddMovieSchema.parse(args);
        const params = {
          ...parsed,
          tags: parsed.tags || undefined,
          monitored: parsed.monitored ?? undefined,
          searchForMovie: parsed.searchForMovie ?? undefined,
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
      id: { type: "number", description: "Movie ID in Radarr" },
      deleteFiles: {
        type: "boolean",
        description: "Whether to delete movie files",
        default: false,
      },
      addImportExclusion: {
        type: "boolean",
        description: "Whether to add import exclusion",
        default: false,
      },
    },
    async (args) => {
      try {
        const parsed = RadarrMovieIdSchema.extend({
          deleteFiles: z.boolean().optional().default(false),
          addImportExclusion: z.boolean().optional().default(false),
        }).parse(args);

        await radarrClient.deleteMovie(
          config,
          parsed.id,
          parsed.deleteFiles,
          parsed.addImportExclusion,
        );
        return {
          content: [{
            type: "text",
            text: `Movie ${parsed.id} deleted successfully`,
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
    RadarrMovieIdSchema.shape,
    async (args) => {
      try {
        const { id } = RadarrMovieIdSchema.parse(args);
        await radarrClient.refreshMovie(config, id);
        return {
          content: [{
            type: "text",
            text: `Movie ${id} refresh initiated successfully`,
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
    RadarrMovieIdSchema.shape,
    async (args) => {
      try {
        const { id } = RadarrMovieIdSchema.parse(args);
        await radarrClient.searchMovieReleases(config, id);
        return {
          content: [{
            type: "text",
            text: `Search for movie ${id} releases initiated successfully`,
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
      limit: {
        type: "number",
        description: "Maximum number of results to return",
      },
      skip: {
        type: "number",
        description: "Number of results to skip (for pagination)",
      },
      filters: {
        type: "object",
        description: "Filter options for movies",
        properties: {
          title: {
            type: "string",
            description: "Filter by title (partial match, case-insensitive)",
          },
          genres: {
            type: "array",
            items: { type: "string" },
            description: "Filter by genres (matches any)",
          },
          yearFrom: { type: "number", description: "Filter by minimum year" },
          yearTo: { type: "number", description: "Filter by maximum year" },
          monitored: {
            type: "boolean",
            description: "Filter by monitored status",
          },
          hasFile: {
            type: "boolean",
            description: "Filter by file availability",
          },
          qualityProfileId: {
            type: "number",
            description: "Filter by quality profile ID",
          },
          tags: {
            type: "array",
            items: { type: "number" },
            description: "Filter by tag IDs (matches any)",
          },
          minimumAvailability: {
            type: "string",
            description: "Filter by minimum availability status",
          },
          imdbId: { type: "string", description: "Filter by IMDB ID" },
          tmdbId: { type: "number", description: "Filter by TMDB ID" },
        },
      },
      sort: {
        type: "object",
        description: "Sort options for movies",
        properties: {
          field: {
            type: "string",
            enum: [
              "title",
              "year",
              "added",
              "sizeOnDisk",
              "qualityProfileId",
              "runtime",
            ],
            description: "Field to sort by",
          },
          direction: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction",
          },
        },
        required: ["field", "direction"],
      },
    },
    async (args) => {
      try {
        const parsed = z.object({
          limit: z.number().optional(),
          skip: z.number().optional(),
          filters: RadarrMovieFiltersSchema.optional(),
          sort: RadarrMovieSortSchema.optional(),
        }).parse(args);
        const results = await radarrClient.getMovies(
          config,
          parsed.limit,
          parsed.skip,
          parsed.filters,
          parsed.sort,
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
    RadarrMovieIdSchema.shape,
    async (args) => {
      try {
        const { id } = RadarrMovieIdSchema.parse(args);
        const result = await radarrClient.getMovie(config, id);
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
    RadarrUpdateMovieSchema.shape,
    async (args) => {
      try {
        const parsed = RadarrUpdateMovieSchema.parse(args);

        // First get the current movie data
        const currentMovie = await radarrClient.getMovie(config, parsed.id);

        // Update only the specified fields
        const updatedMovie: RadarrMovie = {
          ...currentMovie,
          ...(parsed.monitored !== undefined &&
            { monitored: parsed.monitored }),
          ...(parsed.qualityProfileId !== undefined &&
            { qualityProfileId: parsed.qualityProfileId }),
          ...(parsed.minimumAvailability !== undefined &&
            { minimumAvailability: parsed.minimumAvailability }),
          ...(parsed.tags !== undefined && { tags: parsed.tags }),
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
