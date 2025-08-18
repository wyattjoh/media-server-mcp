import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import * as tmdbClient from "@wyattjoh/tmdb";

export function createTMDBTools(
  server: McpServer,
  config: TMDBConfig,
  isToolEnabled: (toolName: string) => boolean,
): void {
  // tmdb_find_by_external_id
  if (isToolEnabled("tmdb_find_by_external_id")) {
    server.registerTool(
      "tmdb_find_by_external_id",
      {
        title:
          "Find TMDB content by external ID (TVDB ID, etc.) from other databases.",
        description:
          "Find TMDB content by external ID (TVDB ID, etc.) from other databases.",
        inputSchema: {
          externalId: z.string().describe(
            "External ID (e.g., 'tt1234567' for movie/TV IDs)",
          ),
          externalSource: z.string().optional().default("imdb_id").describe(
            "External source (default: 'imdb_id')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.findByExternalId(
            config,
            args.externalId,
            args.externalSource,
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

  // tmdb_search_movies
  if (isToolEnabled("tmdb_search_movies")) {
    server.registerTool(
      "tmdb_search_movies",
      {
        title: "Search for movies on TMDB by title",
        description: "Search for movies on TMDB by title",
        inputSchema: {
          query: z.string().describe("Movie title to search for"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchMovies(
            config,
            args.query,
            args.page,
            args.language,
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

  // tmdb_search_tv
  if (isToolEnabled("tmdb_search_tv")) {
    server.registerTool(
      "tmdb_search_tv",
      {
        title: "Search for TV shows on TMDB by title",
        description: "Search for TV shows on TMDB by title",
        inputSchema: {
          query: z.string().describe("TV show title to search for"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchTV(
            config,
            args.query,
            args.page,
            args.language,
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

  // tmdb_search_multi
  if (isToolEnabled("tmdb_search_multi")) {
    server.registerTool(
      "tmdb_search_multi",
      {
        title:
          "Search for movies, TV shows, and people on TMDB in a single request",
        description:
          "Search for movies, TV shows, and people on TMDB in a single request",
        inputSchema: {
          query: z.string().describe(
            "Search query for movies, TV shows, or people",
          ),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchMulti(
            config,
            args.query,
            args.page,
            args.language,
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

  // tmdb_get_popular_movies
  if (isToolEnabled("tmdb_get_popular_movies")) {
    server.registerTool(
      "tmdb_get_popular_movies",
      {
        title: "Get popular movies from TMDB",
        description: "Get popular movies from TMDB",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPopularMovies(
            config,
            args.page,
            args.language,
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

  // tmdb_discover_movies
  if (isToolEnabled("tmdb_discover_movies")) {
    server.registerTool(
      "tmdb_discover_movies",
      {
        title: "Discover movies based on various criteria",
        description: "Discover movies based on various criteria",
        inputSchema: {
          sort_by: z.string().optional().describe(
            "Sort results by field (e.g., 'popularity.desc')",
          ),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          primary_release_year: z.number().optional().describe(
            "Filter by primary release year",
          ),
          release_date_gte: z.string().optional().describe(
            "Minimum release date (YYYY-MM-DD)",
          ),
          release_date_lte: z.string().optional().describe(
            "Maximum release date (YYYY-MM-DD)",
          ),
          vote_average_gte: z.number().min(0).max(10).optional().describe(
            "Minimum vote average (0-10)",
          ),
          vote_average_lte: z.number().min(0).max(10).optional().describe(
            "Maximum vote average (0-10)",
          ),
          vote_count_gte: z.number().min(0).optional().describe(
            "Minimum vote count",
          ),
          with_genres: z.string().optional().describe(
            "Comma-separated genre IDs to include",
          ),
          without_genres: z.string().optional().describe(
            "Comma-separated genre IDs to exclude",
          ),
          with_original_language: z.string().optional().describe(
            "Filter by original language (ISO 639-1)",
          ),
          with_runtime_gte: z.number().min(0).optional().describe(
            "Minimum runtime in minutes",
          ),
          with_runtime_lte: z.number().min(0).optional().describe(
            "Maximum runtime in minutes",
          ),
          certification_country: z.string().optional().describe(
            "Certification country (ISO 3166-1)",
          ),
          certification: z.string().optional().describe(
            "Certification (e.g., 'R', 'PG-13')",
          ),
          include_adult: z.boolean().optional().default(false).describe(
            "Include adult movies",
          ),
          include_video: z.boolean().optional().default(false).describe(
            "Include movies with videos",
          ),
          region: z.string().optional().describe(
            "Region for release dates (ISO 3166-1)",
          ),
          year: z.number().optional().describe("Filter by release year"),
        },
      },
      async (args) => {
        try {
          // Filter out undefined values
          const cleanedOptions: Record<string, string | number | boolean> = {};
          Object.entries(args).forEach(([key, value]) => {
            if (value !== undefined) {
              cleanedOptions[key] = value;
            }
          });

          const result = await tmdbClient.discoverMovies(
            config,
            cleanedOptions,
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

  // tmdb_discover_tv
  if (isToolEnabled("tmdb_discover_tv")) {
    server.registerTool(
      "tmdb_discover_tv",
      {
        title: "Discover TV shows based on various criteria",
        description: "Discover TV shows based on various criteria",
        inputSchema: {
          sort_by: z.string().optional().describe(
            "Sort results by field (e.g., 'popularity.desc')",
          ),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          first_air_date_year: z.number().optional().describe(
            "Filter by first air date year",
          ),
          first_air_date_gte: z.string().optional().describe(
            "Minimum first air date (YYYY-MM-DD)",
          ),
          first_air_date_lte: z.string().optional().describe(
            "Maximum first air date (YYYY-MM-DD)",
          ),
          vote_average_gte: z.number().min(0).max(10).optional().describe(
            "Minimum vote average (0-10)",
          ),
          vote_average_lte: z.number().min(0).max(10).optional().describe(
            "Maximum vote average (0-10)",
          ),
          vote_count_gte: z.number().min(0).optional().describe(
            "Minimum vote count",
          ),
          with_genres: z.string().optional().describe(
            "Comma-separated genre IDs to include",
          ),
          without_genres: z.string().optional().describe(
            "Comma-separated genre IDs to exclude",
          ),
          with_original_language: z.string().optional().describe(
            "Filter by original language (ISO 639-1)",
          ),
          with_runtime_gte: z.number().min(0).optional().describe(
            "Minimum runtime in minutes",
          ),
          with_runtime_lte: z.number().min(0).optional().describe(
            "Maximum runtime in minutes",
          ),
          with_networks: z.string().optional().describe(
            "Comma-separated network IDs",
          ),
          timezone: z.string().optional().describe("Timezone for air dates"),
          include_adult: z.boolean().optional().default(false).describe(
            "Include adult TV shows",
          ),
          screened_theatrically: z.boolean().optional().default(false).describe(
            "Filter by theatrical screening",
          ),
        },
      },
      async (args) => {
        try {
          // Filter out undefined values
          const cleanedOptions: Record<string, string | number | boolean> = {};
          Object.entries(args).forEach(([key, value]) => {
            if (value !== undefined) {
              cleanedOptions[key] = value;
            }
          });

          const result = await tmdbClient.discoverTV(config, cleanedOptions);

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

  // tmdb_get_genres
  if (isToolEnabled("tmdb_get_genres")) {
    server.registerTool(
      "tmdb_get_genres",
      {
        title: "Get list of available genres for movies or TV shows",
        description: "Get list of available genres for movies or TV shows",
        inputSchema: {
          mediaType: z.enum(["movie", "tv"]).describe("Media type for genres"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = args.mediaType === "movie"
            ? await tmdbClient.getMovieGenres(config, args.language)
            : await tmdbClient.getTVGenres(config, args.language);

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

  // tmdb_get_trending
  if (isToolEnabled("tmdb_get_trending")) {
    server.registerTool(
      "tmdb_get_trending",
      {
        title:
          "Get trending movies, TV shows, or people by time window (day/week)",
        description:
          "Get trending movies, TV shows, or people by time window (day/week)",
        inputSchema: {
          mediaType: z.enum(["all", "movie", "tv", "person"]).describe(
            "Type of content to get trending for",
          ),
          timeWindow: z.enum(["day", "week"]).describe(
            "Time window for trending content",
          ),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTrending(
            config,
            args.mediaType,
            args.timeWindow,
            args.page,
            args.language,
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

  // tmdb_get_now_playing_movies
  if (isToolEnabled("tmdb_get_now_playing_movies")) {
    server.registerTool(
      "tmdb_get_now_playing_movies",
      {
        title: "Get movies currently playing in theaters",
        description: "Get movies currently playing in theaters",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          region: z.string().optional().describe(
            "Region for release dates (ISO 3166-1)",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getNowPlayingMovies(
            config,
            args.page,
            args.language,
            args.region,
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

  // tmdb_get_top_rated_movies
  if (isToolEnabled("tmdb_get_top_rated_movies")) {
    server.registerTool(
      "tmdb_get_top_rated_movies",
      {
        title: "Get top-rated movies",
        description: "Get top-rated movies",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          region: z.string().optional().describe(
            "Region for release dates (ISO 3166-1)",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTopRatedMovies(
            config,
            args.page,
            args.language,
            args.region,
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

  // tmdb_get_upcoming_movies
  if (isToolEnabled("tmdb_get_upcoming_movies")) {
    server.registerTool(
      "tmdb_get_upcoming_movies",
      {
        title: "Get upcoming movie releases",
        description: "Get upcoming movie releases",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          region: z.string().optional().describe(
            "Region for release dates (ISO 3166-1)",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getUpcomingMovies(
            config,
            args.page,
            args.language,
            args.region,
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

  // tmdb_get_popular_tv
  if (isToolEnabled("tmdb_get_popular_tv")) {
    server.registerTool(
      "tmdb_get_popular_tv",
      {
        title: "Get popular TV shows",
        description: "Get popular TV shows",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPopularTV(
            config,
            args.page,
            args.language,
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

  // tmdb_get_top_rated_tv
  if (isToolEnabled("tmdb_get_top_rated_tv")) {
    server.registerTool(
      "tmdb_get_top_rated_tv",
      {
        title: "Get top-rated TV shows",
        description: "Get top-rated TV shows",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTopRatedTV(
            config,
            args.page,
            args.language,
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

  // tmdb_get_on_the_air_tv
  if (isToolEnabled("tmdb_get_on_the_air_tv")) {
    server.registerTool(
      "tmdb_get_on_the_air_tv",
      {
        title: "Get TV shows currently on the air",
        description: "Get TV shows currently on the air",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getOnTheAirTV(
            config,
            args.page,
            args.language,
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

  // tmdb_get_airing_today_tv
  if (isToolEnabled("tmdb_get_airing_today_tv")) {
    server.registerTool(
      "tmdb_get_airing_today_tv",
      {
        title: "Get TV shows airing today",
        description: "Get TV shows airing today",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          timezone: z.string().optional().describe("Timezone for air dates"),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getAiringTodayTV(
            config,
            args.page,
            args.language,
            args.timezone,
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

  // tmdb_get_movie_details
  if (isToolEnabled("tmdb_get_movie_details")) {
    server.registerTool(
      "tmdb_get_movie_details",
      {
        title: "Get detailed information about a specific movie",
        description: "Get detailed information about a specific movie",
        inputSchema: {
          movieId: z.number().describe("The TMDB movie ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          appendToResponse: z.string().optional().describe(
            "Comma-separated list of additional details to append (e.g., 'credits,videos')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getMovieDetails(config, args.movieId);

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

  // tmdb_get_tv_details
  if (isToolEnabled("tmdb_get_tv_details")) {
    server.registerTool(
      "tmdb_get_tv_details",
      {
        title: "Get detailed information about a specific TV show",
        description: "Get detailed information about a specific TV show",
        inputSchema: {
          tvId: z.number().describe("The TMDB TV show ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          appendToResponse: z.string().optional().describe(
            "Comma-separated list of additional details to append (e.g., 'credits,videos')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTVDetails(config, args.tvId);

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

  // tmdb_get_movie_recommendations
  if (isToolEnabled("tmdb_get_movie_recommendations")) {
    server.registerTool(
      "tmdb_get_movie_recommendations",
      {
        title: "Get movie recommendations based on a specific movie",
        description: "Get movie recommendations based on a specific movie",
        inputSchema: {
          movieId: z.number().describe("The TMDB movie ID"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getMovieRecommendations(
            config,
            args.movieId,
            args.page,
            args.language,
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

  // tmdb_get_tv_recommendations
  if (isToolEnabled("tmdb_get_tv_recommendations")) {
    server.registerTool(
      "tmdb_get_tv_recommendations",
      {
        title: "Get TV show recommendations based on a specific show",
        description: "Get TV show recommendations based on a specific show",
        inputSchema: {
          tvId: z.number().describe("The TMDB TV show ID"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTVRecommendations(
            config,
            args.tvId,
            args.page,
            args.language,
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

  // tmdb_get_similar_movies
  if (isToolEnabled("tmdb_get_similar_movies")) {
    server.registerTool(
      "tmdb_get_similar_movies",
      {
        title: "Get movies similar to a specific movie",
        description: "Get movies similar to a specific movie",
        inputSchema: {
          movieId: z.number().describe("The TMDB movie ID"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getSimilarMovies(
            config,
            args.movieId,
            args.page,
            args.language,
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

  // tmdb_get_similar_tv
  if (isToolEnabled("tmdb_get_similar_tv")) {
    server.registerTool(
      "tmdb_get_similar_tv",
      {
        title: "Get TV shows similar to a specific show",
        description: "Get TV shows similar to a specific show",
        inputSchema: {
          tvId: z.number().describe("The TMDB TV show ID"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getSimilarTV(
            config,
            args.tvId,
            args.page,
            args.language,
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

  // tmdb_search_people
  if (isToolEnabled("tmdb_search_people")) {
    server.registerTool(
      "tmdb_search_people",
      {
        title: "Search for people (actors, directors, etc.)",
        description: "Search for people (actors, directors, etc.)",
        inputSchema: {
          query: z.string().describe("Search query for person name"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          include_adult: z.boolean().optional().default(false).describe(
            "Include adult content",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchPeople(
            config,
            args.query,
            args.page,
            args.language,
            args.include_adult,
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
  // tmdb_get_popular_people
  if (isToolEnabled("tmdb_get_popular_people")) {
    server.registerTool(
      "tmdb_get_popular_people",
      {
        title: "Get popular people in the entertainment industry",
        description: "Get popular people in the entertainment industry",
        inputSchema: {
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPopularPeople(
            config,
            args.page,
            args.language,
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
  // tmdb_get_person_details
  if (isToolEnabled("tmdb_get_person_details")) {
    server.registerTool(
      "tmdb_get_person_details",
      {
        title: "Get detailed information about a specific person",
        description: "Get detailed information about a specific person",
        inputSchema: {
          personId: z.number().describe("The TMDB person ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          appendToResponse: z.string().optional().describe(
            "Comma-separated list of additional details to append (e.g., 'movie_credits,tv_credits')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPersonDetails(
            config,
            args.personId,
            args.language,
            args.appendToResponse,
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
  // tmdb_get_person_movie_credits
  if (isToolEnabled("tmdb_get_person_movie_credits")) {
    server.registerTool(
      "tmdb_get_person_movie_credits",
      {
        title: "Get movie credits for a person",
        description: "Get movie credits for a person",
        inputSchema: {
          personId: z.number().describe("The TMDB person ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPersonMovieCredits(
            config,
            args.personId,
            args.language,
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
  // tmdb_get_person_tv_credits
  if (isToolEnabled("tmdb_get_person_tv_credits")) {
    server.registerTool(
      "tmdb_get_person_tv_credits",
      {
        title: "Get TV credits for a person",
        description: "Get TV credits for a person",
        inputSchema: {
          personId: z.number().describe("The TMDB person ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getPersonTVCredits(
            config,
            args.personId,
            args.language,
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
  // tmdb_search_collections
  if (isToolEnabled("tmdb_search_collections")) {
    server.registerTool(
      "tmdb_search_collections",
      {
        title: "Search for movie collections",
        description: "Search for movie collections",
        inputSchema: {
          query: z.string().describe("Search query for collection name"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchCollections(
            config,
            args.query,
            args.page,
            args.language,
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
  // tmdb_get_collection_details
  if (isToolEnabled("tmdb_get_collection_details")) {
    server.registerTool(
      "tmdb_get_collection_details",
      {
        title: "Get details about a specific movie collection",
        description: "Get details about a specific movie collection",
        inputSchema: {
          collectionId: z.number().describe("The TMDB collection ID"),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getCollectionDetails(
            config,
            args.collectionId,
            args.language,
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
  // tmdb_search_keywords
  if (isToolEnabled("tmdb_search_keywords")) {
    server.registerTool(
      "tmdb_search_keywords",
      {
        title: "Search for keywords",
        description: "Search for keywords",
        inputSchema: {
          query: z.string().describe("Search query for keyword"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.searchKeywords(
            config,
            args.query,
            args.page,
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
  // tmdb_get_movies_by_keyword
  if (isToolEnabled("tmdb_get_movies_by_keyword")) {
    server.registerTool(
      "tmdb_get_movies_by_keyword",
      {
        title: "Get movies associated with a specific keyword",
        description: "Get movies associated with a specific keyword",
        inputSchema: {
          keywordId: z.number().describe("The TMDB keyword ID"),
          page: z.number().min(1).max(1000).optional().describe(
            "Page number (1-1000)",
          ),
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
          include_adult: z.boolean().optional().default(false).describe(
            "Include adult movies",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getMoviesByKeyword(
            config,
            args.keywordId,
            args.page,
            args.language,
            args.include_adult,
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
  // tmdb_get_certifications
  if (isToolEnabled("tmdb_get_certifications")) {
    server.registerTool(
      "tmdb_get_certifications",
      {
        title: "Get certification lists for movies or TV shows",
        description: "Get certification lists for movies or TV shows",
        inputSchema: {
          mediaType: z.enum(["movie", "tv"]).describe(
            "Media type for certifications",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getCertifications(
            config,
            args.mediaType,
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
  // tmdb_get_watch_providers
  if (isToolEnabled("tmdb_get_watch_providers")) {
    server.registerTool(
      "tmdb_get_watch_providers",
      {
        title: "Get watch providers for a movie or TV show",
        description: "Get watch providers for a movie or TV show",
        inputSchema: {
          mediaType: z.enum(["movie", "tv"]).describe("Media type"),
          mediaId: z.number().describe("The TMDB ID of the movie or TV show"),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getWatchProviders(
            config,
            args.mediaType,
            args.mediaId,
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
  // tmdb_get_configuration
  if (isToolEnabled("tmdb_get_configuration")) {
    server.registerTool(
      "tmdb_get_configuration",
      {
        title: "Get TMDB API configuration including image base URLs",
        description: "Get TMDB API configuration including image base URLs",
        inputSchema: {},
      },
      async () => {
        try {
          const result = await tmdbClient.getConfiguration(config);

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
  // tmdb_get_countries
  if (isToolEnabled("tmdb_get_countries")) {
    server.registerTool(
      "tmdb_get_countries",
      {
        title: "Get list of countries used in TMDB",
        description: "Get list of countries used in TMDB",
        inputSchema: {
          language: z.string().optional().default("en-US").describe(
            "Language code (e.g., 'en-US')",
          ),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getCountries(config, args.language);

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
  // tmdb_get_languages
  if (isToolEnabled("tmdb_get_languages")) {
    server.registerTool(
      "tmdb_get_languages",
      {
        title: "Get list of languages used in TMDB",
        description: "Get list of languages used in TMDB",
        inputSchema: {},
      },
      async () => {
        try {
          const result = await tmdbClient.getLanguages(config);

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
  // tmdb_get_movie_credits
  if (isToolEnabled("tmdb_get_movie_credits")) {
    server.registerTool(
      "tmdb_get_movie_credits",
      {
        title: "Get cast and crew for a movie",
        description: "Get cast and crew for a movie",
        inputSchema: {
          movieId: z.number().describe("The TMDB movie ID"),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getMovieCredits(config, args.movieId);

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
  // tmdb_get_tv_credits
  if (isToolEnabled("tmdb_get_tv_credits")) {
    server.registerTool(
      "tmdb_get_tv_credits",
      {
        title: "Get cast and crew for a TV show",
        description: "Get cast and crew for a TV show",
        inputSchema: {
          tvId: z.number().describe("The TMDB TV show ID"),
        },
      },
      async (args) => {
        try {
          const result = await tmdbClient.getTVCredits(config, args.tvId);

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
}
