import type {
  IMDBCastResponse,
  IMDBMovieDetails,
  IMDBPopularMoviesResponse,
  IMDBPopularTVShowsResponse,
  IMDBSearchResponse,
  IMDBTopMovie,
  IMDBTopMoviesResponse,
} from "../types/imdb.ts";
import type { PaginatedResponse } from "../types/mcp.ts";

export interface IMDBConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly apiHost: string;
}

export function createIMDBConfig(
  baseUrl: string,
  apiKey: string,
): IMDBConfig {
  const hostUrl = new URL(baseUrl);

  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey,
    apiHost: hostUrl.hostname,
  };
}

async function makeRequest<T>(
  config: IMDBConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;

  const headers = {
    "x-rapidapi-key": config.apiKey,
    "x-rapidapi-host": config.apiHost,
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
        `IMDB API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `IMDB API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Search for movies/shows
export async function searchIMDB(
  config: IMDBConfig,
  query: string,
  limit?: number,
  skip?: number,
): Promise<IMDBSearchResponse> {
  const response = await makeRequest<IMDBSearchResponse>(
    config,
    `/search?originalTitle=${encodeURIComponent(query)}`,
  );

  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    const paginatedResults = response.results.slice(startIndex, endIndex);

    return {
      ...response,
      results: paginatedResults,
    };
  }

  return response;
}

// Get detailed information about a movie/show
export function getIMDBDetails(
  config: IMDBConfig,
  imdbId: string,
): Promise<IMDBMovieDetails> {
  return makeRequest<IMDBMovieDetails>(config, `/${imdbId}`);
}

// Get top 250 movies
export async function getTopMovies(
  config: IMDBConfig,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<IMDBTopMoviesResponse>> {
  const rawResponse = await makeRequest<IMDBTopMovie[]>(
    config,
    "/top250-movies",
  );

  const total = rawResponse.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedItems = rawResponse.slice(startIndex, endIndex);

  const response: IMDBTopMoviesResponse = {
    items: paginatedItems,
    errorMessage: undefined,
  };

  return {
    data: response,
    total,
    returned: paginatedItems.length,
    skip: startIndex,
    limit,
  };
}

// Get most popular movies
export async function getPopularMovies(
  config: IMDBConfig,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<IMDBPopularMoviesResponse>> {
  const rawResponse = await makeRequest<IMDBPopularMoviesResponse>(
    config,
    "/most-popular-movies",
  );

  const total = rawResponse.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = rawResponse.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Get most popular TV shows
export async function getPopularTVShows(
  config: IMDBConfig,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<IMDBPopularTVShowsResponse>> {
  const rawResponse = await makeRequest<IMDBPopularTVShowsResponse>(
    config,
    "/most-popular-tv",
  );

  const total = rawResponse.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = rawResponse.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Get cast information for a movie/show
export async function getCast(
  config: IMDBConfig,
  imdbId: string,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<IMDBCastResponse>> {
  const response = await makeRequest<IMDBCastResponse>(
    config,
    `/${imdbId}/cast`,
  );

  const total = response.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = response.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Test connection to IMDB API
export async function testConnection(
  config: IMDBConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    await makeRequest<unknown>(config, "/types");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
