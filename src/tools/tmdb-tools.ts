import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { TMDBConfig } from "../clients/tmdb.ts";
import * as tmdbClient from "../clients/tmdb.ts";
import type { MCPToolResult } from "../types/mcp.ts";
import {
  TMDBDiscoverMoviesSchema,
  TMDBDiscoverTVSchema,
  TMDBFindByExternalIdSchema,
  TMDBGetAiringTodayTVSchema,
  TMDBGetCertificationsSchema,
  TMDBGetCollectionDetailsSchema,
  TMDBGetCountriesSchema,
  TMDBGetGenresSchema,
  TMDBGetMovieDetailsSchema,
  TMDBGetMovieRecommendationsSchema,
  TMDBGetMoviesByKeywordSchema,
  TMDBGetNowPlayingMoviesSchema,
  TMDBGetOnTheAirTVSchema,
  TMDBGetPersonDetailsSchema,
  TMDBGetPersonMovieCreditsSchema,
  TMDBGetPersonTVCreditsSchema,
  TMDBGetPopularMoviesSchema,
  TMDBGetPopularPeopleSchema,
  TMDBGetPopularTVSchema,
  TMDBGetSimilarMoviesSchema,
  TMDBGetSimilarTVSchema,
  TMDBGetTopRatedMoviesSchema,
  TMDBGetTopRatedTVSchema,
  TMDBGetTrendingSchema,
  TMDBGetTVDetailsSchema,
  TMDBGetTVRecommendationsSchema,
  TMDBGetUpcomingMoviesSchema,
  TMDBGetWatchProvidersSchema,
  TMDBSearchCollectionsSchema,
  TMDBSearchKeywordsSchema,
  TMDBSearchMovieSchema,
  TMDBSearchMultiSchema,
  TMDBSearchPeopleSchema,
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
      name: "tmdb_get_popular_movies",
      description: "Get popular movies from TMDB",
      inputSchema: {
        type: "object",
        properties: {
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
    // Trending content tool
    {
      name: "tmdb_get_trending",
      description:
        "Get trending movies, TV shows, or people by time window (day/week)",
      inputSchema: {
        type: "object",
        properties: {
          mediaType: {
            type: "string",
            enum: ["all", "movie", "tv", "person"],
            description: "Type of content to get trending for",
          },
          timeWindow: {
            type: "string",
            enum: ["day", "week"],
            description: "Time window for trending content",
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
        required: ["mediaType", "timeWindow"],
      },
    },
    // Movie lists tools
    {
      name: "tmdb_get_now_playing_movies",
      description: "Get movies currently playing in theaters",
      inputSchema: {
        type: "object",
        properties: {
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
          region: {
            type: "string",
            description: "Region for release dates (ISO 3166-1)",
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
      name: "tmdb_get_top_rated_movies",
      description: "Get top-rated movies",
      inputSchema: {
        type: "object",
        properties: {
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
          region: {
            type: "string",
            description: "Region for release dates (ISO 3166-1)",
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
      name: "tmdb_get_upcoming_movies",
      description: "Get upcoming movie releases",
      inputSchema: {
        type: "object",
        properties: {
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
          region: {
            type: "string",
            description: "Region for release dates (ISO 3166-1)",
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
    // TV show lists tools
    {
      name: "tmdb_get_popular_tv",
      description: "Get popular TV shows",
      inputSchema: {
        type: "object",
        properties: {
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
      },
    },
    {
      name: "tmdb_get_top_rated_tv",
      description: "Get top-rated TV shows",
      inputSchema: {
        type: "object",
        properties: {
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
      },
    },
    {
      name: "tmdb_get_on_the_air_tv",
      description: "Get TV shows currently on the air",
      inputSchema: {
        type: "object",
        properties: {
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
      },
    },
    {
      name: "tmdb_get_airing_today_tv",
      description: "Get TV shows airing today",
      inputSchema: {
        type: "object",
        properties: {
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
          timezone: {
            type: "string",
            description: "Timezone for air dates",
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
    // Content details tools
    {
      name: "tmdb_get_movie_details",
      description: "Get detailed information about a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB movie ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          appendToResponse: {
            type: "string",
            description:
              "Comma-separated list of additional details to append (e.g., 'credits,videos')",
          },
        },
        required: ["movieId"],
      },
    },
    {
      name: "tmdb_get_tv_details",
      description: "Get detailed information about a specific TV show",
      inputSchema: {
        type: "object",
        properties: {
          tvId: {
            type: "number",
            description: "The TMDB TV show ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          appendToResponse: {
            type: "string",
            description:
              "Comma-separated list of additional details to append (e.g., 'credits,videos')",
          },
        },
        required: ["tvId"],
      },
    },
    // Recommendations and similar content tools
    {
      name: "tmdb_get_movie_recommendations",
      description: "Get movie recommendations based on a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB movie ID",
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
        required: ["movieId"],
      },
    },
    {
      name: "tmdb_get_tv_recommendations",
      description: "Get TV show recommendations based on a specific show",
      inputSchema: {
        type: "object",
        properties: {
          tvId: {
            type: "number",
            description: "The TMDB TV show ID",
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
        required: ["tvId"],
      },
    },
    {
      name: "tmdb_get_similar_movies",
      description: "Get movies similar to a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB movie ID",
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
        required: ["movieId"],
      },
    },
    {
      name: "tmdb_get_similar_tv",
      description: "Get TV shows similar to a specific show",
      inputSchema: {
        type: "object",
        properties: {
          tvId: {
            type: "number",
            description: "The TMDB TV show ID",
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
        required: ["tvId"],
      },
    },
    // People discovery tools
    {
      name: "tmdb_search_people",
      description: "Search for people (actors, directors, etc.)",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for person name",
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
          include_adult: {
            type: "boolean",
            description: "Include adult content",
            default: false,
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
      name: "tmdb_get_popular_people",
      description: "Get popular people",
      inputSchema: {
        type: "object",
        properties: {
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
      },
    },
    {
      name: "tmdb_get_person_details",
      description: "Get detailed information about a person",
      inputSchema: {
        type: "object",
        properties: {
          personId: {
            type: "number",
            description: "The TMDB person ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
          appendToResponse: {
            type: "string",
            description:
              "Comma-separated list of additional details to append (e.g., 'movie_credits,tv_credits')",
          },
        },
        required: ["personId"],
      },
    },
    {
      name: "tmdb_get_person_movie_credits",
      description: "Get movie credits for a person",
      inputSchema: {
        type: "object",
        properties: {
          personId: {
            type: "number",
            description: "The TMDB person ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
        },
        required: ["personId"],
      },
    },
    {
      name: "tmdb_get_person_tv_credits",
      description: "Get TV credits for a person",
      inputSchema: {
        type: "object",
        properties: {
          personId: {
            type: "number",
            description: "The TMDB person ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
        },
        required: ["personId"],
      },
    },
    // Collections and keywords tools
    {
      name: "tmdb_search_collections",
      description: "Search for movie collections",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for collection name",
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
      name: "tmdb_get_collection_details",
      description: "Get details about a movie collection",
      inputSchema: {
        type: "object",
        properties: {
          collectionId: {
            type: "number",
            description: "The TMDB collection ID",
          },
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
        },
        required: ["collectionId"],
      },
    },
    {
      name: "tmdb_search_keywords",
      description: "Search for keywords",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for keyword",
          },
          page: {
            type: "number",
            description: "Page number (1-1000)",
            minimum: 1,
            maximum: 1000,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "tmdb_get_movies_by_keyword",
      description: "Get movies associated with a keyword",
      inputSchema: {
        type: "object",
        properties: {
          keywordId: {
            type: "number",
            description: "The TMDB keyword ID",
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
          include_adult: {
            type: "boolean",
            description: "Include adult movies",
            default: false,
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
        required: ["keywordId"],
      },
    },
    // Certifications and watch providers tools
    {
      name: "tmdb_get_certifications",
      description: "Get certification lists for movies or TV shows",
      inputSchema: {
        type: "object",
        properties: {
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Media type for certifications",
          },
        },
        required: ["mediaType"],
      },
    },
    {
      name: "tmdb_get_watch_providers",
      description: "Get watch providers for a movie or TV show",
      inputSchema: {
        type: "object",
        properties: {
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Media type",
          },
          mediaId: {
            type: "number",
            description: "The TMDB ID of the movie or TV show",
          },
        },
        required: ["mediaType", "mediaId"],
      },
    },
    // Configuration tools
    {
      name: "tmdb_get_configuration",
      description: "Get TMDB API configuration including image base URLs",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "tmdb_get_countries",
      description: "Get list of countries used in TMDB",
      inputSchema: {
        type: "object",
        properties: {
          language: {
            type: "string",
            description: "Language code (e.g., 'en-US')",
            default: "en-US",
          },
        },
      },
    },
    {
      name: "tmdb_get_languages",
      description: "Get list of languages used in TMDB",
      inputSchema: {
        type: "object",
        properties: {},
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

      case "tmdb_get_popular_movies": {
        const { page, language, limit, skip } = TMDBGetPopularMoviesSchema
          .parse(args);
        const result = await tmdbClient.getPopularMovies(
          config,
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

      case "tmdb_get_trending": {
        const { mediaType, timeWindow, page, language, limit, skip } =
          TMDBGetTrendingSchema.parse(args);
        const result = await tmdbClient.getTrending(
          config,
          mediaType,
          timeWindow,
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

      case "tmdb_get_now_playing_movies": {
        const { page, language, region, limit, skip } =
          TMDBGetNowPlayingMoviesSchema.parse(args);
        const result = await tmdbClient.getNowPlayingMovies(
          config,
          page,
          language,
          region,
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

      case "tmdb_get_top_rated_movies": {
        const { page, language, region, limit, skip } =
          TMDBGetTopRatedMoviesSchema.parse(args);
        const result = await tmdbClient.getTopRatedMovies(
          config,
          page,
          language,
          region,
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

      case "tmdb_get_upcoming_movies": {
        const { page, language, region, limit, skip } =
          TMDBGetUpcomingMoviesSchema.parse(args);
        const result = await tmdbClient.getUpcomingMovies(
          config,
          page,
          language,
          region,
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

      case "tmdb_get_popular_tv": {
        const { page, language, limit, skip } = TMDBGetPopularTVSchema.parse(
          args,
        );
        const result = await tmdbClient.getPopularTV(config, page, language);

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

      case "tmdb_get_top_rated_tv": {
        const { page, language, limit, skip } = TMDBGetTopRatedTVSchema.parse(
          args,
        );
        const result = await tmdbClient.getTopRatedTV(config, page, language);

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

      case "tmdb_get_on_the_air_tv": {
        const { page, language, limit, skip } = TMDBGetOnTheAirTVSchema.parse(
          args,
        );
        const result = await tmdbClient.getOnTheAirTV(config, page, language);

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

      case "tmdb_get_airing_today_tv": {
        const { page, language, timezone, limit, skip } =
          TMDBGetAiringTodayTVSchema.parse(args);
        const result = await tmdbClient.getAiringTodayTV(
          config,
          page,
          language,
          timezone,
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

      case "tmdb_get_movie_details": {
        const { movieId, language, appendToResponse } =
          TMDBGetMovieDetailsSchema.parse(args);

        let url = `/movie/${movieId}`;
        const params = new URLSearchParams();
        if (language) params.set("language", language);
        if (appendToResponse) {
          params.set("append_to_response", appendToResponse);
        }
        if (params.toString()) url += `?${params.toString()}`;

        const result = await tmdbClient.getMovieDetails(config, movieId);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_tv_details": {
        const { tvId, language, appendToResponse } = TMDBGetTVDetailsSchema
          .parse(args);

        let url = `/tv/${tvId}`;
        const params = new URLSearchParams();
        if (language) params.set("language", language);
        if (appendToResponse) {
          params.set("append_to_response", appendToResponse);
        }
        if (params.toString()) url += `?${params.toString()}`;

        const result = await tmdbClient.getTVDetails(config, tvId);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_movie_recommendations": {
        const { movieId, page, language, limit, skip } =
          TMDBGetMovieRecommendationsSchema.parse(args);
        const result = await tmdbClient.getMovieRecommendations(
          config,
          movieId,
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

      case "tmdb_get_tv_recommendations": {
        const { tvId, page, language, limit, skip } =
          TMDBGetTVRecommendationsSchema.parse(args);
        const result = await tmdbClient.getTVRecommendations(
          config,
          tvId,
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

      case "tmdb_get_similar_movies": {
        const { movieId, page, language, limit, skip } =
          TMDBGetSimilarMoviesSchema.parse(args);
        const result = await tmdbClient.getSimilarMovies(
          config,
          movieId,
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

      case "tmdb_get_similar_tv": {
        const { tvId, page, language, limit, skip } = TMDBGetSimilarTVSchema
          .parse(args);
        const result = await tmdbClient.getSimilarTV(
          config,
          tvId,
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

      case "tmdb_search_people": {
        const { query, page, language, include_adult, limit, skip } =
          TMDBSearchPeopleSchema.parse(args);
        const result = await tmdbClient.searchPeople(
          config,
          query,
          page,
          language,
          include_adult,
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

      case "tmdb_get_popular_people": {
        const { page, language, limit, skip } = TMDBGetPopularPeopleSchema
          .parse(
            args,
          );
        const result = await tmdbClient.getPopularPeople(
          config,
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

      case "tmdb_get_person_details": {
        const { personId, language, appendToResponse } =
          TMDBGetPersonDetailsSchema.parse(args);
        const result = await tmdbClient.getPersonDetails(
          config,
          personId,
          language,
          appendToResponse,
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_person_movie_credits": {
        const { personId, language } = TMDBGetPersonMovieCreditsSchema.parse(
          args,
        );
        const result = await tmdbClient.getPersonMovieCredits(
          config,
          personId,
          language,
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_person_tv_credits": {
        const { personId, language } = TMDBGetPersonTVCreditsSchema.parse(args);
        const result = await tmdbClient.getPersonTVCredits(
          config,
          personId,
          language,
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_search_collections": {
        const { query, page, language, limit, skip } =
          TMDBSearchCollectionsSchema.parse(args);
        const result = await tmdbClient.searchCollections(
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

      case "tmdb_get_collection_details": {
        const { collectionId, language } = TMDBGetCollectionDetailsSchema.parse(
          args,
        );
        const result = await tmdbClient.getCollectionDetails(
          config,
          collectionId,
          language,
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_search_keywords": {
        const { query, page } = TMDBSearchKeywordsSchema.parse(args);
        const result = await tmdbClient.searchKeywords(config, query, page);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_movies_by_keyword": {
        const { keywordId, page, language, include_adult, limit, skip } =
          TMDBGetMoviesByKeywordSchema.parse(args);
        const result = await tmdbClient.getMoviesByKeyword(
          config,
          keywordId,
          page,
          language,
          include_adult,
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

      case "tmdb_get_certifications": {
        const { mediaType } = TMDBGetCertificationsSchema.parse(args);
        const result = await tmdbClient.getCertifications(config, mediaType);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_watch_providers": {
        const { mediaType, mediaId } = TMDBGetWatchProvidersSchema.parse(args);
        const result = await tmdbClient.getWatchProviders(
          config,
          mediaType,
          mediaId,
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_configuration": {
        const result = await tmdbClient.getConfiguration(config);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_countries": {
        const { language } = TMDBGetCountriesSchema.parse(args);
        const result = await tmdbClient.getCountries(config, language);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "tmdb_get_languages": {
        const result = await tmdbClient.getLanguages(config);

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
