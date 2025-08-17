import type {
  RadarrAddMovieOptions,
  RadarrHealth,
  RadarrMovie,
  RadarrMovieFilters,
  RadarrMovieSortField,
  RadarrQualityProfile,
  RadarrQueueItem,
  RadarrQueueResponse,
  RadarrRootFolder,
  RadarrSearchResult,
  RadarrSystemStatus,
} from "./types.ts";
import type { PaginatedResponse } from "./mcp.ts";
import { isValidationErrorArray, ValidationException } from "./validation.ts";
import type { SortOptions } from "./shared-types.ts";
import { applyRadarrMovieFilters, sortRadarrMovies } from "./radarr-filters.ts";

export interface RadarrConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createRadarrConfig(
  baseUrl: string,
  apiKey: string,
): RadarrConfig {
  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey,
  };
}

async function makeRequest<T>(
  config: RadarrConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.baseUrl}/api/v3${endpoint}`;
  const headers = {
    "X-Api-Key": config.apiKey,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to parse validation errors for 400 responses
      if (response.status === 400) {
        try {
          const errorData = await response.json();
          if (isValidationErrorArray(errorData)) {
            throw new ValidationException(errorData);
          }
        } catch (parseError) {
          // Re-throw if it's already a ValidationException
          if (parseError instanceof ValidationException) {
            throw parseError;
          }
          // Otherwise, fall back to standard error
        }
      }

      throw new Error(
        `${response.status} ${response.statusText}`,
      );
    }

    const contentLength = response.headers.get("content-length");
    const contentType = response.headers.get("content-type");

    // Handle empty responses (like 204 No Content or 200 with no body)
    if (contentLength === "0" || (!contentLength && !contentType)) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    // Re-throw ValidationException as-is
    if (error instanceof ValidationException) {
      throw error;
    }

    throw new Error(
      `Radarr API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Search for movies
export async function searchMovie(
  config: RadarrConfig,
  term: string,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<RadarrSearchResult[]>> {
  const results = await makeRequest<RadarrSearchResult[]>(
    config,
    `/movie/lookup?term=${encodeURIComponent(term)}`,
  );

  const total = results.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = results.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Get all movies
export async function getMovies(
  config: RadarrConfig,
  limit?: number,
  skip?: number,
  filters?: RadarrMovieFilters,
  sort?: SortOptions<RadarrMovieSortField>,
): Promise<PaginatedResponse<RadarrMovie[]>> {
  const results = await makeRequest<RadarrMovie[]>(config, "/movie");

  // Apply filters
  let filteredResults = applyRadarrMovieFilters(results, filters);

  // Apply sorting
  filteredResults = sortRadarrMovies(filteredResults, sort);

  const total = filteredResults.length;
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = filteredResults.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Get specific movie by ID
export function getMovie(
  config: RadarrConfig,
  id: number,
): Promise<RadarrMovie> {
  return makeRequest<RadarrMovie>(config, `/movie/${id}`);
}

// Add a movie
export async function addMovie(
  config: RadarrConfig,
  options: RadarrAddMovieOptions,
): Promise<RadarrMovie> {
  // First, try to search for the movie to get complete metadata
  let movieMetadata: RadarrSearchResult | undefined;

  try {
    const searchResults = await searchMovie(config, `tmdb:${options.tmdbId}`);
    movieMetadata = searchResults.data.find((m) => m.tmdbId === options.tmdbId);
  } catch {
    // If search fails, continue with user-provided data
  }

  const payload = {
    title: options.title,
    qualityProfileId: options.qualityProfileId,
    minimumAvailability: options.minimumAvailability,
    monitored: options.monitored ?? true,
    tmdbId: options.tmdbId,
    year: options.year,
    rootFolderPath: options.rootFolderPath,
    tags: options.tags ?? [],
    // Use metadata from search if available
    ...(movieMetadata && {
      overview: movieMetadata.overview,
      images: movieMetadata.images,
      website: movieMetadata.website,
      runtime: movieMetadata.runtime,
      certification: movieMetadata.certification,
      genres: movieMetadata.genres,
      ratings: movieMetadata.ratings,
      titleSlug: movieMetadata.titleSlug,
      imdbId: movieMetadata.imdbId,
      inCinemas: movieMetadata.inCinemas,
      physicalRelease: movieMetadata.physicalRelease,
      digitalRelease: movieMetadata.digitalRelease,
    }),
    addOptions: {
      searchForMovie: options.searchForMovie ?? false,
    },
  };

  try {
    return await makeRequest<RadarrMovie>(config, "/movie", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Check if it's a validation error
    if (error instanceof ValidationException) {
      // Check for specific validation errors
      const movieExistsError = error.errors.find(
        (e) => e.errorCode === "MovieExistsValidator",
      );
      if (movieExistsError) {
        throw new Error(
          `Movie already exists in Radarr library (TMDB ID: ${options.tmdbId})`,
        );
      }
      // Re-throw other validation errors with formatted message
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Try alternative payload structure if first attempt fails
    if (errorMessage.includes("400") || errorMessage.includes("Validation")) {
      const simplifiedPayload = {
        title: options.title,
        qualityProfileId: options.qualityProfileId,
        minimumAvailability: options.minimumAvailability,
        monitored: options.monitored ?? true,
        tmdbId: options.tmdbId,
        year: options.year,
        rootFolderPath: options.rootFolderPath,
        tags: options.tags ?? [],
        // Flatten addOptions for compatibility
        searchForMovie: options.searchForMovie ?? false,
      };

      try {
        return await makeRequest<RadarrMovie>(config, "/movie", {
          method: "POST",
          body: JSON.stringify(simplifiedPayload),
        });
      } catch (retryError) {
        // Check if it's a validation error on retry
        if (retryError instanceof ValidationException) {
          const movieExistsError = retryError.errors.find(
            (e) => e.errorCode === "MovieExistsValidator",
          );
          if (movieExistsError) {
            throw new Error(
              `Movie already exists in Radarr library (TMDB ID: ${options.tmdbId})`,
            );
          }
          throw retryError;
        }

        const retryErrorMessage = retryError instanceof Error
          ? retryError.message
          : String(retryError);

        throw new Error(
          `Failed to add movie to Radarr: ${retryErrorMessage}`,
        );
      }
    }

    throw error;
  }
}

// Update a movie
export function updateMovie(
  config: RadarrConfig,
  movie: RadarrMovie,
): Promise<RadarrMovie> {
  return makeRequest<RadarrMovie>(config, `/movie/${movie.id}`, {
    method: "PUT",
    body: JSON.stringify(movie),
  });
}

// Delete a movie
export async function deleteMovie(
  config: RadarrConfig,
  id: number,
  deleteFiles = false,
  addImportExclusion = false,
): Promise<void> {
  const params = new URLSearchParams();
  if (deleteFiles) params.append("deleteFiles", "true");
  if (addImportExclusion) params.append("addImportExclusion", "true");

  const queryString = params.toString();
  const endpoint = `/movie/${id}${queryString ? `?${queryString}` : ""}`;

  await makeRequest<void>(config, endpoint, {
    method: "DELETE",
  });
}

// Get queue
export async function getQueue(
  config: RadarrConfig,
  limit?: number,
  skip?: number,
): Promise<RadarrQueueItem[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append("pageSize", limit.toString());
  if (skip !== undefined) {
    params.append("page", Math.floor(skip / (limit || 20) + 1).toString());
  }

  const queryString = params.toString();
  const endpoint = `/queue${queryString ? `?${queryString}` : ""}`;

  const response = await makeRequest<RadarrQueueResponse>(config, endpoint);
  return response.records;
}

// Get quality profiles
export function getQualityProfiles(
  config: RadarrConfig,
): Promise<RadarrQualityProfile[]> {
  return makeRequest<RadarrQualityProfile[]>(config, "/qualityProfile");
}

// Get root folders
export function getRootFolders(
  config: RadarrConfig,
): Promise<RadarrRootFolder[]> {
  return makeRequest<RadarrRootFolder[]>(config, "/rootFolder");
}

// Get system status
export function getSystemStatus(
  config: RadarrConfig,
): Promise<RadarrSystemStatus> {
  return makeRequest<RadarrSystemStatus>(config, "/system/status");
}

// Get health
export function getHealth(config: RadarrConfig): Promise<RadarrHealth[]> {
  return makeRequest<RadarrHealth[]>(config, "/health");
}

// Refresh movie
export async function refreshMovie(
  config: RadarrConfig,
  id: number,
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RefreshMovie",
      movieId: id,
    }),
  });
}

// Refresh all movies
export async function refreshAllMovies(config: RadarrConfig): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RefreshMovie",
    }),
  });
}

// Search for movie releases
export async function searchMovieReleases(
  config: RadarrConfig,
  id: number,
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "MoviesSearch",
      movieIds: [id],
    }),
  });
}

// Scan disk for movies
export async function diskScan(config: RadarrConfig): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RescanMovie",
    }),
  });
}

// Test connection
export async function testConnection(
  config: RadarrConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSystemStatus(config);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
