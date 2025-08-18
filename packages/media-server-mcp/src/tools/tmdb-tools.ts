import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import * as tmdbClient from "@wyattjoh/tmdb";

export function createTMDBTools(server: McpServer, config: TMDBConfig): void {
  // tmdb_find_by_external_id
  server.tool(
    "tmdb_find_by_external_id",
    "Find TMDB content by external ID (TVDB ID, etc.) from other databases.",
    {
      externalId: z.string().describe(
        "External ID (e.g., 'tt1234567' for movie/TV IDs)",
      ),
      externalSource: z.string().optional().default("imdb_id").describe(
        "External source (default: 'imdb_id')",
      ),
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

  // tmdb_search_movies
  server.tool(
    "tmdb_search_movies",
    "Search for movies on TMDB by title",
    {
      query: z.string().describe("Movie title to search for"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_search_tv
  server.tool(
    "tmdb_search_tv",
    "Search for TV shows on TMDB by title",
    {
      query: z.string().describe("TV show title to search for"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_search_multi
  server.tool(
    "tmdb_search_multi",
    "Search for movies, TV shows, and people on TMDB in a single request",
    {
      query: z.string().describe(
        "Search query for movies, TV shows, or people",
      ),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_popular_movies
  server.tool(
    "tmdb_get_popular_movies",
    "Get popular movies from TMDB",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_discover_movies
  server.tool(
    "tmdb_discover_movies",
    "Discover movies based on various criteria",
    {
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
      include_adult: z.boolean().optional().default(false).describe("Include adult movies"),
      include_video: z.boolean().optional().default(false).describe(
        "Include movies with videos",
      ),
      region: z.string().optional().describe(
        "Region for release dates (ISO 3166-1)",
      ),
      year: z.number().optional().describe("Filter by release year"),
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

  // tmdb_discover_tv
  server.tool(
    "tmdb_discover_tv",
    "Discover TV shows based on various criteria",
    {
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
      include_adult: z.boolean().optional().default(false).describe("Include adult TV shows"),
      screened_theatrically: z.boolean().optional().default(false).describe(
        "Filter by theatrical screening",
      ),
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

  // tmdb_get_genres
  server.tool(
    "tmdb_get_genres",
    "Get list of available genres for movies or TV shows",
    {
      mediaType: z.enum(["movie", "tv"]).describe("Media type for genres"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_trending
  server.tool(
    "tmdb_get_trending",
    "Get trending movies, TV shows, or people by time window (day/week)",
    {
      mediaType: z.enum(["all", "movie", "tv", "person"]).describe(
        "Type of content to get trending for",
      ),
      timeWindow: z.enum(["day", "week"]).describe(
        "Time window for trending content",
      ),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_now_playing_movies
  server.tool(
    "tmdb_get_now_playing_movies",
    "Get movies currently playing in theaters",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      region: z.string().optional().describe(
        "Region for release dates (ISO 3166-1)",
      ),
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

  // tmdb_get_top_rated_movies
  server.tool(
    "tmdb_get_top_rated_movies",
    "Get top-rated movies",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      region: z.string().optional().describe(
        "Region for release dates (ISO 3166-1)",
      ),
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

  // tmdb_get_upcoming_movies
  server.tool(
    "tmdb_get_upcoming_movies",
    "Get upcoming movie releases",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      region: z.string().optional().describe(
        "Region for release dates (ISO 3166-1)",
      ),
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

  // tmdb_get_popular_tv
  server.tool(
    "tmdb_get_popular_tv",
    "Get popular TV shows",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_top_rated_tv
  server.tool(
    "tmdb_get_top_rated_tv",
    "Get top-rated TV shows",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_on_the_air_tv
  server.tool(
    "tmdb_get_on_the_air_tv",
    "Get TV shows currently on the air",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_airing_today_tv
  server.tool(
    "tmdb_get_airing_today_tv",
    "Get TV shows airing today",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      timezone: z.string().optional().describe("Timezone for air dates"),
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

  // tmdb_get_movie_details
  server.tool(
    "tmdb_get_movie_details",
    "Get detailed information about a specific movie",
    {
      movieId: z.number().describe("The TMDB movie ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      appendToResponse: z.string().optional().describe(
        "Comma-separated list of additional details to append (e.g., 'credits,videos')",
      ),
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

  // tmdb_get_tv_details
  server.tool(
    "tmdb_get_tv_details",
    "Get detailed information about a specific TV show",
    {
      tvId: z.number().describe("The TMDB TV show ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      appendToResponse: z.string().optional().describe(
        "Comma-separated list of additional details to append (e.g., 'credits,videos')",
      ),
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

  // tmdb_get_movie_recommendations
  server.tool(
    "tmdb_get_movie_recommendations",
    "Get movie recommendations based on a specific movie",
    {
      movieId: z.number().describe("The TMDB movie ID"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_tv_recommendations
  server.tool(
    "tmdb_get_tv_recommendations",
    "Get TV show recommendations based on a specific show",
    {
      tvId: z.number().describe("The TMDB TV show ID"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_similar_movies
  server.tool(
    "tmdb_get_similar_movies",
    "Get movies similar to a specific movie",
    {
      movieId: z.number().describe("The TMDB movie ID"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_similar_tv
  server.tool(
    "tmdb_get_similar_tv",
    "Get TV shows similar to a specific show",
    {
      tvId: z.number().describe("The TMDB TV show ID"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_search_people
  server.tool(
    "tmdb_search_people",
    "Search for people (actors, directors, etc.)",
    {
      query: z.string().describe("Search query for person name"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      include_adult: z.boolean().optional().default(false).describe("Include adult content"),
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

  // tmdb_get_popular_people
  server.tool(
    "tmdb_get_popular_people",
    "Get popular people in the entertainment industry",
    {
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_person_details
  server.tool(
    "tmdb_get_person_details",
    "Get detailed information about a specific person",
    {
      personId: z.number().describe("The TMDB person ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      appendToResponse: z.string().optional().describe(
        "Comma-separated list of additional details to append (e.g., 'movie_credits,tv_credits')",
      ),
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

  // tmdb_get_person_movie_credits
  server.tool(
    "tmdb_get_person_movie_credits",
    "Get movie credits for a person",
    {
      personId: z.number().describe("The TMDB person ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_person_tv_credits
  server.tool(
    "tmdb_get_person_tv_credits",
    "Get TV credits for a person",
    {
      personId: z.number().describe("The TMDB person ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_search_collections
  server.tool(
    "tmdb_search_collections",
    "Search for movie collections",
    {
      query: z.string().describe("Search query for collection name"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_collection_details
  server.tool(
    "tmdb_get_collection_details",
    "Get details about a specific movie collection",
    {
      collectionId: z.number().describe("The TMDB collection ID"),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_search_keywords
  server.tool(
    "tmdb_search_keywords",
    "Search for keywords",
    {
      query: z.string().describe("Search query for keyword"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
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

  // tmdb_get_movies_by_keyword
  server.tool(
    "tmdb_get_movies_by_keyword",
    "Get movies associated with a specific keyword",
    {
      keywordId: z.number().describe("The TMDB keyword ID"),
      page: z.number().min(1).max(1000).optional().describe(
        "Page number (1-1000)",
      ),
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
      include_adult: z.boolean().optional().default(false).describe("Include adult movies"),
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

  // tmdb_get_certifications
  server.tool(
    "tmdb_get_certifications",
    "Get certification lists for movies or TV shows",
    {
      mediaType: z.enum(["movie", "tv"]).describe(
        "Media type for certifications",
      ),
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

  // tmdb_get_watch_providers
  server.tool(
    "tmdb_get_watch_providers",
    "Get watch providers for a movie or TV show",
    {
      mediaType: z.enum(["movie", "tv"]).describe("Media type"),
      mediaId: z.number().describe("The TMDB ID of the movie or TV show"),
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

  // tmdb_get_configuration
  server.tool(
    "tmdb_get_configuration",
    "Get TMDB API configuration including image base URLs",
    {},
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

  // tmdb_get_countries
  server.tool(
    "tmdb_get_countries",
    "Get list of countries used in TMDB",
    {
      language: z.string().optional().default("en-US").describe("Language code (e.g., 'en-US')"),
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

  // tmdb_get_languages
  server.tool(
    "tmdb_get_languages",
    "Get list of languages used in TMDB",
    {},
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

  // tmdb_get_movie_credits
  server.tool(
    "tmdb_get_movie_credits",
    "Get cast and crew for a movie",
    {
      movieId: z.number().describe("The TMDB movie ID"),
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

  // tmdb_get_tv_credits
  server.tool(
    "tmdb_get_tv_credits",
    "Get cast and crew for a TV show",
    {
      tvId: z.number().describe("The TMDB TV show ID"),
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
