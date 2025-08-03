import type {
  RadarrAddMovieOptions,
  RadarrHealth,
  RadarrMovie,
  RadarrQualityProfile,
  RadarrQueueItem,
  RadarrRootFolder,
  RadarrSearchResult,
  RadarrSystemStatus,
} from "../types/radarr.ts";

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
      throw new Error(
        `Radarr API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
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
): Promise<RadarrSearchResult[]> {
  const results = await makeRequest<RadarrSearchResult[]>(
    config,
    `/movie/lookup?term=${encodeURIComponent(term)}`,
  );

  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    return results.slice(startIndex, endIndex);
  }

  return results;
}

// Get all movies
export async function getMovies(
  config: RadarrConfig,
  limit?: number,
  skip?: number,
): Promise<RadarrMovie[]> {
  const results = await makeRequest<RadarrMovie[]>(config, "/movie");

  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    return results.slice(startIndex, endIndex);
  }

  return results;
}

// Get specific movie by ID
export function getMovie(
  config: RadarrConfig,
  id: number,
): Promise<RadarrMovie> {
  return makeRequest<RadarrMovie>(config, `/movie/${id}`);
}

// Add a movie
export function addMovie(
  config: RadarrConfig,
  options: RadarrAddMovieOptions,
): Promise<RadarrMovie> {
  const payload = {
    title: options.title,
    qualityProfileId: options.qualityProfileId,
    minimumAvailability: options.minimumAvailability,
    monitored: options.monitored ?? true,
    tmdbId: options.tmdbId,
    year: options.year,
    rootFolderPath: options.rootFolderPath,
    tags: options.tags ?? [],
    addOptions: {
      searchForMovie: options.searchForMovie ?? false,
    },
  };

  return makeRequest<RadarrMovie>(config, "/movie", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
  const results = await makeRequest<RadarrQueueItem[]>(config, "/queue");

  if (limit !== undefined || skip !== undefined) {
    const startIndex = skip || 0;
    const endIndex = limit !== undefined ? startIndex + limit : undefined;
    return results.slice(startIndex, endIndex);
  }

  return results;
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
