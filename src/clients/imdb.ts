import type {
  IMDBCastResponse,
  IMDBMovieDetails,
  IMDBPopularMovie,
  IMDBPopularMoviesResponse,
  IMDBPopularTVShow,
  IMDBPopularTVShowsResponse,
  IMDBSearchResponse,
  IMDBTopMovie,
  IMDBTopMoviesResponse,
} from "../types/imdb.ts";

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
): Promise<IMDBTopMoviesResponse> {
  const rawResponse = await makeRequest<IMDBTopMovie[]>(
    config,
    "/top250-movies",
  );

  // Handle pagination if requested
  let items = rawResponse;
  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    items = rawResponse.slice(startIndex, endIndex);
  }

  // Return response in expected wrapper format
  return {
    items,
    errorMessage: undefined,
  };
}

// Get most popular movies
export async function getPopularMovies(
  config: IMDBConfig,
  limit?: number,
  skip?: number,
): Promise<IMDBPopularMoviesResponse> {
  const rawResponse = await makeRequest<IMDBPopularMovie[]>(
    config,
    "/most-popular-movies",
  );

  // Handle pagination if requested
  let items = rawResponse;
  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    items = rawResponse.slice(startIndex, endIndex);
  }

  // Return response in expected wrapper format
  return {
    items,
    errorMessage: undefined,
  };
}

// Get most popular TV shows
export async function getPopularTVShows(
  config: IMDBConfig,
  limit?: number,
  skip?: number,
): Promise<IMDBPopularTVShowsResponse> {
  const rawResponse = await makeRequest<IMDBPopularTVShow[]>(
    config,
    "/most-popular-tv",
  );

  // Handle pagination if requested
  let items = rawResponse;
  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    items = rawResponse.slice(startIndex, endIndex);
  }

  // Return response in expected wrapper format
  return {
    items,
    errorMessage: undefined,
  };
}

// Get cast information for a movie/show
export async function getCast(
  config: IMDBConfig,
  imdbId: string,
  limit?: number,
  skip?: number,
): Promise<IMDBCastResponse> {
  const response = await makeRequest<IMDBCastResponse>(
    config,
    `/${imdbId}/cast`,
  );

  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;

    return {
      ...response,
      actors: response.actors.slice(startIndex, endIndex),
      directors: response.directors.slice(startIndex, endIndex),
      writers: response.writers.slice(startIndex, endIndex),
    };
  }

  return response;
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
