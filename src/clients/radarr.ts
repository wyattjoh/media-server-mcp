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
export function searchMovie(
  config: RadarrConfig,
  term: string,
): Promise<RadarrSearchResult[]> {
  return makeRequest<RadarrSearchResult[]>(
    config,
    `/movie/lookup?term=${encodeURIComponent(term)}`,
  );
}

// Get all movies
export function getMovies(config: RadarrConfig): Promise<RadarrMovie[]> {
  return makeRequest<RadarrMovie[]>(config, "/movie");
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
export function getQueue(config: RadarrConfig): Promise<RadarrQueueItem[]> {
  return makeRequest<RadarrQueueItem[]>(config, "/queue");
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
export async function testConnection(config: RadarrConfig): Promise<boolean> {
  try {
    await getSystemStatus(config);
    return true;
  } catch {
    return false;
  }
}
