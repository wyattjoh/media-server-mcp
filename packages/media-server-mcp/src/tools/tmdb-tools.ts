import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import * as tmdbClient from "@wyattjoh/tmdb";

// TMDB tool schemas
const TMDBFindByExternalIdSchema = z.object({
  externalId: z.string(),
  externalSource: z.string().optional(),
});

const TMDBSearchMovieSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBSearchTVSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBSearchMultiSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetPopularMoviesSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBDiscoverMoviesSchema = z.object({
  sort_by: z.string().optional(),
  page: z.number().min(1).max(1000).optional(),
  primary_release_year: z.number().optional(),
  release_date_gte: z.string().optional(),
  release_date_lte: z.string().optional(),
  vote_average_gte: z.number().min(0).max(10).optional(),
  vote_average_lte: z.number().min(0).max(10).optional(),
  vote_count_gte: z.number().min(0).optional(),
  with_genres: z.string().optional(),
  without_genres: z.string().optional(),
  with_original_language: z.string().optional(),
  with_runtime_gte: z.number().min(0).optional(),
  with_runtime_lte: z.number().min(0).optional(),
  certification_country: z.string().optional(),
  certification: z.string().optional(),
  include_adult: z.boolean().optional(),
  include_video: z.boolean().optional(),
  region: z.string().optional(),
  year: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBDiscoverTVSchema = z.object({
  sort_by: z.string().optional(),
  page: z.number().min(1).max(1000).optional(),
  first_air_date_year: z.number().optional(),
  first_air_date_gte: z.string().optional(),
  first_air_date_lte: z.string().optional(),
  vote_average_gte: z.number().min(0).max(10).optional(),
  vote_average_lte: z.number().min(0).max(10).optional(),
  vote_count_gte: z.number().min(0).optional(),
  with_genres: z.string().optional(),
  without_genres: z.string().optional(),
  with_original_language: z.string().optional(),
  with_runtime_gte: z.number().min(0).optional(),
  with_runtime_lte: z.number().min(0).optional(),
  with_networks: z.string().optional(),
  timezone: z.string().optional(),
  include_adult: z.boolean().optional(),
  screened_theatrically: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetGenresSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  language: z.string().optional(),
});

// Trending content schema
const TMDBGetTrendingSchema = z.object({
  mediaType: z.enum(["all", "movie", "tv", "person"]),
  timeWindow: z.enum(["day", "week"]),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// Movie lists schemas
const TMDBGetNowPlayingMoviesSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetTopRatedMoviesSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetUpcomingMoviesSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  region: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// TV lists schemas
const TMDBGetPopularTVSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetTopRatedTVSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetOnTheAirTVSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetAiringTodayTVSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// Content details schemas
const TMDBGetMovieDetailsSchema = z.object({
  movieId: z.number(),
  language: z.string().optional(),
  appendToResponse: z.string().optional(),
});

const TMDBGetTVDetailsSchema = z.object({
  tvId: z.number(),
  language: z.string().optional(),
  appendToResponse: z.string().optional(),
});

// Recommendations schemas
const TMDBGetMovieRecommendationsSchema = z.object({
  movieId: z.number(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetTVRecommendationsSchema = z.object({
  tvId: z.number(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// Similar content schemas
const TMDBGetSimilarMoviesSchema = z.object({
  movieId: z.number(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetSimilarTVSchema = z.object({
  tvId: z.number(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// People schemas
const TMDBSearchPeopleSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  include_adult: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetPopularPeopleSchema = z.object({
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetPersonDetailsSchema = z.object({
  personId: z.number(),
  language: z.string().optional(),
  appendToResponse: z.string().optional(),
});

const TMDBGetPersonMovieCreditsSchema = z.object({
  personId: z.number(),
  language: z.string().optional(),
});

const TMDBGetPersonTVCreditsSchema = z.object({
  personId: z.number(),
  language: z.string().optional(),
});

// Collections and keywords schemas
const TMDBSearchCollectionsSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

const TMDBGetCollectionDetailsSchema = z.object({
  collectionId: z.number(),
  language: z.string().optional(),
});

const TMDBSearchKeywordsSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
});

const TMDBGetMoviesByKeywordSchema = z.object({
  keywordId: z.number(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  include_adult: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

// Certifications schema
const TMDBGetCertificationsSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
});

// Watch providers schema
const TMDBGetWatchProvidersSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  mediaId: z.number(),
});

// Configuration schemas
const TMDBGetConfigurationSchema = z.object({});

const TMDBGetCountriesSchema = z.object({
  language: z.string().optional(),
});

const TMDBGetLanguagesSchema = z.object({});

export function createTMDBTools(server: McpServer, config: TMDBConfig): void {
  // tmdb_find_by_external_id
  server.tool(
    "tmdb_find_by_external_id",
    "Find TMDB content by external ID (TVDB ID, etc.) from other databases.",
    TMDBFindByExternalIdSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchMovieSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchTVSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchMultiSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPopularMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBDiscoverMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBDiscoverTVSchema.shape,
    async (args) => {
      try {
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
    TMDBGetGenresSchema.shape,
    async (args) => {
      try {
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
    TMDBGetTrendingSchema.shape,
    async (args) => {
      try {
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
    TMDBGetNowPlayingMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBGetTopRatedMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBGetUpcomingMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPopularTVSchema.shape,
    async (args) => {
      try {
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
    TMDBGetTopRatedTVSchema.shape,
    async (args) => {
      try {
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
    TMDBGetOnTheAirTVSchema.shape,
    async (args) => {
      try {
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
    TMDBGetAiringTodayTVSchema.shape,
    async (args) => {
      try {
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
    TMDBGetMovieDetailsSchema.shape,
    async (args) => {
      try {
        const { movieId, language: _language, appendToResponse: _appendToResponse } =
          TMDBGetMovieDetailsSchema.parse(args);

        const result = await tmdbClient.getMovieDetails(config, movieId);

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
    TMDBGetTVDetailsSchema.shape,
    async (args) => {
      try {
        const { tvId, language: _language, appendToResponse: _appendToResponse } = TMDBGetTVDetailsSchema
          .parse(args);

        const result = await tmdbClient.getTVDetails(config, tvId);

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
    TMDBGetMovieRecommendationsSchema.shape,
    async (args) => {
      try {
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
    TMDBGetTVRecommendationsSchema.shape,
    async (args) => {
      try {
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
    TMDBGetSimilarMoviesSchema.shape,
    async (args) => {
      try {
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
    TMDBGetSimilarTVSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchPeopleSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPopularPeopleSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPersonDetailsSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPersonMovieCreditsSchema.shape,
    async (args) => {
      try {
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
    TMDBGetPersonTVCreditsSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchCollectionsSchema.shape,
    async (args) => {
      try {
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
    TMDBGetCollectionDetailsSchema.shape,
    async (args) => {
      try {
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
    TMDBSearchKeywordsSchema.shape,
    async (args) => {
      try {
        const { query, page } = TMDBSearchKeywordsSchema.parse(args);
        const result = await tmdbClient.searchKeywords(config, query, page);

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
    TMDBGetMoviesByKeywordSchema.shape,
    async (args) => {
      try {
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
    TMDBGetCertificationsSchema.shape,
    async (args) => {
      try {
        const { mediaType } = TMDBGetCertificationsSchema.parse(args);
        const result = await tmdbClient.getCertifications(config, mediaType);

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
    TMDBGetWatchProvidersSchema.shape,
    async (args) => {
      try {
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
    TMDBGetConfigurationSchema.shape,
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
    TMDBGetCountriesSchema.shape,
    async (args) => {
      try {
        const { language } = TMDBGetCountriesSchema.parse(args);
        const result = await tmdbClient.getCountries(config, language);

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
    TMDBGetLanguagesSchema.shape,
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
    { movieId: { type: "number", description: "The TMDB movie ID" } },
    async (args) => {
      try {
        const { movieId } = z.object({ movieId: z.number() }).parse(args);
        const result = await tmdbClient.getMovieCredits(config, movieId);

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
    { tvId: { type: "number", description: "The TMDB TV show ID" } },
    async (args) => {
      try {
        const { tvId } = z.object({ tvId: z.number() }).parse(args);
        const result = await tmdbClient.getTVCredits(config, tvId);

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
