import type {
  TMDBConfiguration,
  TMDBCredits,
  TMDBDiscoverMovieOptions,
  TMDBDiscoverMovieResponse,
  TMDBDiscoverTVOptions,
  TMDBDiscoverTVResponse,
  TMDBFindResponse,
  TMDBGenresResponse,
  TMDBMovieDetails,
  TMDBMovieSearchResponse,
  TMDBMultiSearchResponse,
  TMDBTVDetails,
  TMDBTVSearchResponse,
} from "../types/tmdb.ts";
import type { PaginatedResponse } from "../types/mcp.ts";

export interface TMDBConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createTMDBConfig(apiKey: string): TMDBConfig {
  return {
    baseUrl: "https://api.themoviedb.org/3",
    apiKey,
  };
}

async function makeRequest<T>(
  config: TMDBConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;

  const headers = {
    "accept": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `TMDB API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `TMDB API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Find content by external ID (IMDB ID, TVDB ID, etc.)
export function findByExternalId(
  config: TMDBConfig,
  externalId: string,
  externalSource = "imdb_id",
): Promise<TMDBFindResponse> {
  return makeRequest<TMDBFindResponse>(
    config,
    `/find/${externalId}?external_source=${externalSource}`,
  );
}

// Search for movies
export function searchMovies(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/search/movie?${params.toString()}`,
  );
}

// Search for TV shows
export function searchTV(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/search/tv?${params.toString()}`,
  );
}

// Multi search (movies, TV shows, and people)
export function searchMulti(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBMultiSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMultiSearchResponse>(
    config,
    `/search/multi?${params.toString()}`,
  );
}

// Discover movies with advanced filtering
export function discoverMovies(
  config: TMDBConfig,
  options: TMDBDiscoverMovieOptions = {},
): Promise<TMDBDiscoverMovieResponse> {
  const params = new URLSearchParams();

  // Add all provided options to params
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value.toString());
    }
  });

  return makeRequest<TMDBDiscoverMovieResponse>(
    config,
    `/discover/movie?${params.toString()}`,
  );
}

// Discover TV shows with advanced filtering
export function discoverTV(
  config: TMDBConfig,
  options: TMDBDiscoverTVOptions = {},
): Promise<TMDBDiscoverTVResponse> {
  const params = new URLSearchParams();

  // Add all provided options to params
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value.toString());
    }
  });

  return makeRequest<TMDBDiscoverTVResponse>(
    config,
    `/discover/tv?${params.toString()}`,
  );
}

// Get movie genres
export function getMovieGenres(
  config: TMDBConfig,
  language = "en-US",
): Promise<TMDBGenresResponse> {
  return makeRequest<TMDBGenresResponse>(
    config,
    `/genre/movie/list?language=${language}`,
  );
}

// Get TV genres
export function getTVGenres(
  config: TMDBConfig,
  language = "en-US",
): Promise<TMDBGenresResponse> {
  return makeRequest<TMDBGenresResponse>(
    config,
    `/genre/tv/list?language=${language}`,
  );
}

// Get API configuration
export function getConfiguration(
  config: TMDBConfig,
): Promise<TMDBConfiguration> {
  return makeRequest<TMDBConfiguration>(config, "/configuration");
}

// Get detailed movie information
export function getMovieDetails(
  config: TMDBConfig,
  movieId: number,
): Promise<TMDBMovieDetails> {
  return makeRequest<TMDBMovieDetails>(config, `/movie/${movieId}`);
}

// Get detailed TV show information
export function getTVDetails(
  config: TMDBConfig,
  tvId: number,
): Promise<TMDBTVDetails> {
  return makeRequest<TMDBTVDetails>(config, `/tv/${tvId}`);
}

// Get movie credits (cast and crew)
export function getMovieCredits(
  config: TMDBConfig,
  movieId: number,
): Promise<TMDBCredits> {
  return makeRequest<TMDBCredits>(config, `/movie/${movieId}/credits`);
}

// Get TV show credits (cast and crew)
export function getTVCredits(
  config: TMDBConfig,
  tvId: number,
): Promise<TMDBCredits> {
  return makeRequest<TMDBCredits>(config, `/tv/${tvId}/credits`);
}

// Helper function to convert search results to paginated response
export function toPaginatedResponse<T>(
  searchResponse: {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
  },
  limit?: number,
  skip?: number,
): PaginatedResponse<T[]> {
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = searchResponse.results.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total: searchResponse.total_results,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Test connection to TMDB API
export async function testConnection(
  config: TMDBConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    await makeRequest<{ success: boolean }>(config, "/authentication");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
