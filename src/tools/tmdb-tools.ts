import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { TMDBConfig } from "../clients/tmdb.ts";
import * as tmdbClient from "../clients/tmdb.ts";
import type { MCPToolResult } from "../types/mcp.ts";
import {
  TMDBDiscoverMoviesSchema,
  TMDBDiscoverTVSchema,
  TMDBFindByExternalIdSchema,
  TMDBGetGenresSchema,
  TMDBSearchMovieSchema,
  TMDBSearchMultiSchema,
  TMDBSearchTVSchema,
} from "../types/tmdb.ts";

export function createTMDBTools(): Tool[] {
  return [
    {
      name: "tmdb_find_by_external_id",
      description:
        "Find TMDB content by external ID (IMDB ID, TVDB ID, etc.). Perfect for converting IMDB IDs to TMDB data.",
      inputSchema: {
        type: "object",
        properties: {
          externalId: {
            type: "string",
            description: "External ID (e.g., IMDB ID like 'tt1234567')",
          },
          externalSource: {
            type: "string",
            description: "External source (default: 'imdb_id')",
            default: "imdb_id",
          },
        },
        required: ["externalId"],
      },
    },
    {
      name: "tmdb_search_movies",
      description: "Search for movies on TMDB by title",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Movie title to search for",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            minimum: 1,
            maximum: 100,
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            minimum: 0,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "tmdb_search_tv",
      description: "Search for TV shows on TMDB by title",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "TV show title to search for",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            minimum: 1,
            maximum: 100,
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            minimum: 0,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "tmdb_search_multi",
      description:
        "Search for movies, TV shows, and people on TMDB in a single request",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for movies, TV shows, or people",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            minimum: 1,
            maximum: 100,
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            minimum: 0,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "tmdb_discover_movies",
      description: "Discover movies based on various criteria",
      inputSchema: {
        type: "object",
        properties: {
          sort_by: {
            type: "string",
            description: "Sort results by field (e.g., 'popularity.desc')",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
          primary_release_year: {
            type: "number",
            description: "Filter by primary release year",
          },
          release_date_gte: {
            type: "string",
            description: "Minimum release date (YYYY-MM-DD)",
          },
          release_date_lte: {
            type: "string",
            description: "Maximum release date (YYYY-MM-DD)",
          },
          vote_average_gte: {
            type: "number",
            description: "Minimum vote average (0-10)",
            minimum: 0,
            maximum: 10,
          },
          vote_average_lte: {
            type: "number",
            description: "Maximum vote average (0-10)",
            minimum: 0,
            maximum: 10,
          },
          vote_count_gte: {
            type: "number",
            description: "Minimum vote count",
            minimum: 0,
          },
          with_genres: {
            type: "string",
            description: "Comma-separated genre IDs to include",
          },
          without_genres: {
            type: "string",
            description: "Comma-separated genre IDs to exclude",
          },
          with_original_language: {
            type: "string",
            description: "Filter by original language (ISO 639-1)",
          },
          with_runtime_gte: {
            type: "number",
            description: "Minimum runtime in minutes",
            minimum: 0,
          },
          with_runtime_lte: {
            type: "number",
            description: "Maximum runtime in minutes",
            minimum: 0,
          },
          certification_country: {
            type: "string",
            description: "Certification country (ISO 3166-1)",
          },
          certification: {
            type: "string",
            description: "Certification (e.g., 'R', 'PG-13')",
          },
          include_adult: {
            type: "boolean",
            description: "Include adult movies",
          },
          include_video: {
            type: "boolean",
            description: "Include movies with videos",
          },
          region: {
            type: "string",
            description: "Region for release dates (ISO 3166-1)",
          },
          year: {
            type: "number",
            description: "Filter by release year",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            minimum: 1,
            maximum: 100,
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            minimum: 0,
          },
        },
      },
    },
    {
      name: "tmdb_discover_tv",
      description: "Discover TV shows based on various criteria",
      inputSchema: {
        type: "object",
        properties: {
          sort_by: {
            type: "string",
            description: "Sort results by field (e.g., 'popularity.desc')",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
          first_air_date_year: {
            type: "number",
            description: "Filter by first air date year",
          },
          first_air_date_gte: {
            type: "string",
            description: "Minimum first air date (YYYY-MM-DD)",
          },
          first_air_date_lte: {
            type: "string",
            description: "Maximum first air date (YYYY-MM-DD)",
          },
          vote_average_gte: {
            type: "number",
            description: "Minimum vote average (0-10)",
            minimum: 0,
            maximum: 10,
          },
          vote_average_lte: {
            type: "number",
            description: "Maximum vote average (0-10)",
            minimum: 0,
            maximum: 10,
          },
          vote_count_gte: {
            type: "number",
            description: "Minimum vote count",
            minimum: 0,
          },
          with_genres: {
            type: "string",
            description: "Comma-separated genre IDs to include",
          },
          without_genres: {
            type: "string",
            description: "Comma-separated genre IDs to exclude",
          },
          with_original_language: {
            type: "string",
            description: "Filter by original language (ISO 639-1)",
          },
          with_runtime_gte: {
            type: "number",
            description: "Minimum runtime in minutes",
            minimum: 0,
          },
          with_runtime_lte: {
            type: "number",
            description: "Maximum runtime in minutes",
            minimum: 0,
          },
          with_networks: {
            type: "string",
            description: "Comma-separated network IDs",
          },
          timezone: {
            type: "string",
            description: "Timezone for air dates",
          },
          include_adult: {
            type: "boolean",
            description: "Include adult TV shows",
          },
          screened_theatrically: {
            type: "boolean",
            description: "Filter by theatrical screening",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
            minimum: 1,
            maximum: 100,
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
            minimum: 0,
          },
        },
      },
    },
    {
      name: "tmdb_get_genres",
      description: "Get list of available genres for movies or TV shows",
      inputSchema: {
        type: "object",
        properties: {
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Media type for genres",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
        },
        required: ["mediaType"],
      },
    },
  ];
}

export async function handleTMDBTool(
  name: string,
  args: unknown,
  config: TMDBConfig,
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case "tmdb_find_by_external_id": {
        const { externalId, externalSource } = TMDBFindByExternalIdSchema.parse(
          args,
        );
        const result = await tmdbClient.findByExternalId(
          config,
          externalId,
          externalSource,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_search_movies": {
        const { query, page, language, limit, skip } = TMDBSearchMovieSchema
          .parse(args);
        const result = await tmdbClient.searchMovies(
          config,
          query,
          page,
          language,
        );

        if (limit !== undefined || skip !== undefined) {
          const paginated = tmdbClient.toPaginatedResponse(result, limit, skip);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(paginated, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_search_tv": {
        const { query, page, language, limit, skip } = TMDBSearchTVSchema.parse(
          args,
        );
        const result = await tmdbClient.searchTV(
          config,
          query,
          page,
          language,
        );

        if (limit !== undefined || skip !== undefined) {
          const paginated = tmdbClient.toPaginatedResponse(result, limit, skip);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(paginated, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_search_multi": {
        const { query, page, language, limit, skip } = TMDBSearchMultiSchema
          .parse(args);
        const result = await tmdbClient.searchMulti(
          config,
          query,
          page,
          language,
        );

        if (limit !== undefined || skip !== undefined) {
          const paginated = tmdbClient.toPaginatedResponse(result, limit, skip);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(paginated, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_discover_movies": {
        const options = TMDBDiscoverMoviesSchema.parse(args);
        const { limit, skip, ...discoverOptions } = options;

        // Filter out undefined values
        const cleanedOptions: Record<string, string | number | boolean> = {};
        Object.entries(discoverOptions).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanedOptions[key] = value;
          }
        });

        const result = await tmdbClient.discoverMovies(
          config,
          cleanedOptions,
        );

        if (limit !== undefined || skip !== undefined) {
          const paginated = tmdbClient.toPaginatedResponse(result, limit, skip);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(paginated, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_discover_tv": {
        const options = TMDBDiscoverTVSchema.parse(args);
        const { limit, skip, ...discoverOptions } = options;

        // Filter out undefined values
        const cleanedOptions: Record<string, string | number | boolean> = {};
        Object.entries(discoverOptions).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanedOptions[key] = value;
          }
        });

        const result = await tmdbClient.discoverTV(config, cleanedOptions);

        if (limit !== undefined || skip !== undefined) {
          const paginated = tmdbClient.toPaginatedResponse(result, limit, skip);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(paginated, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_genres": {
        const { mediaType, language } = TMDBGetGenresSchema.parse(args);

        const result = mediaType === "movie"
          ? await tmdbClient.getMovieGenres(config, language)
          : await tmdbClient.getTVGenres(config, language);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown TMDB tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }],
      isError: true,
    };
  }
}
