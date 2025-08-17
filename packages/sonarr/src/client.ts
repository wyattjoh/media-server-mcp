import type {
  SonarrAddSeriesOptions,
  SonarrCalendarItem,
  SonarrEpisode,
  SonarrHealth,
  SonarrQualityProfile,
  SonarrQueueItem,
  SonarrQueueResponse,
  SonarrRootFolder,
  SonarrSeries,
  SonarrSeriesFilters,
  SonarrSeriesSortField,
  SonarrSystemStatus,
} from "./types.ts";
import type { PaginatedResponse } from "./mcp.ts";
import { isValidationErrorArray, ValidationException } from "./validation.ts";
import type { SortOptions } from "./shared-types.ts";
import {
  applySonarrSeriesFilters,
  sortSonarrSeries,
} from "./sonarr-filters.ts";

export interface SonarrConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createSonarrConfig(
  baseUrl: string,
  apiKey: string,
): SonarrConfig {
  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey,
  };
}

async function makeRequest<T>(
  config: SonarrConfig,
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
      `Sonarr API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Search for series
export async function searchSeries(
  config: SonarrConfig,
  term: string,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<SonarrSeries[]>> {
  const results = await makeRequest<SonarrSeries[]>(
    config,
    `/series/lookup?term=${encodeURIComponent(term)}`,
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

// Get all series
export async function getSeries(
  config: SonarrConfig,
  limit?: number,
  skip?: number,
  filters?: SonarrSeriesFilters,
  sort?: SortOptions<SonarrSeriesSortField>,
): Promise<PaginatedResponse<SonarrSeries[]>> {
  const results = await makeRequest<SonarrSeries[]>(config, "/series");

  // Apply filters
  let filteredResults = applySonarrSeriesFilters(results, filters);

  // Apply sorting
  filteredResults = sortSonarrSeries(filteredResults, sort);

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

// Get specific series by ID
export function getSeriesById(
  config: SonarrConfig,
  id: number,
): Promise<SonarrSeries> {
  return makeRequest<SonarrSeries>(config, `/series/${id}`);
}

// Add a series
export async function addSeries(
  config: SonarrConfig,
  options: SonarrAddSeriesOptions,
): Promise<SonarrSeries> {
  const payload = {
    title: options.title,
    qualityProfileId: options.qualityProfileId,
    languageProfileId: options.languageProfileId ?? 1,
    monitored: options.monitored ?? true,
    tvdbId: options.tvdbId,
    rootFolderPath: options.rootFolderPath,
    seasonFolder: options.seasonFolder ?? true,
    seriesType: options.seriesType ?? "standard",
    tags: options.tags ?? [],
    seasons: options.seasons ?? [],
    addOptions: {
      ignoreEpisodesWithFiles: options.addOptions?.ignoreEpisodesWithFiles ??
        false,
      ignoreEpisodesWithoutFiles:
        options.addOptions?.ignoreEpisodesWithoutFiles ?? false,
      searchForMissingEpisodes: options.addOptions?.searchForMissingEpisodes ??
        false,
    },
  };

  try {
    return await makeRequest<SonarrSeries>(config, "/series", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Check if it's a validation error
    if (error instanceof ValidationException) {
      // Check for specific validation errors
      const seriesExistsError = error.errors.find(
        (e) => e.errorCode === "SeriesExistsValidator",
      );
      if (seriesExistsError) {
        throw new Error(
          `Series already exists in Sonarr library (TVDB ID: ${options.tvdbId})`,
        );
      }
      // Re-throw other validation errors with formatted message
      throw error;
    }

    throw error;
  }
}

// Update a series
export function updateSeries(
  config: SonarrConfig,
  series: SonarrSeries,
): Promise<SonarrSeries> {
  return makeRequest<SonarrSeries>(config, `/series/${series.id}`, {
    method: "PUT",
    body: JSON.stringify(series),
  });
}

// Delete a series
export async function deleteSeries(
  config: SonarrConfig,
  id: number,
  deleteFiles = false,
  addImportExclusion = false,
): Promise<void> {
  const params = new URLSearchParams();
  if (deleteFiles) params.append("deleteFiles", "true");
  if (addImportExclusion) params.append("addImportExclusion", "true");

  const queryString = params.toString();
  const endpoint = `/series/${id}${queryString ? `?${queryString}` : ""}`;

  await makeRequest<void>(config, endpoint, {
    method: "DELETE",
  });
}

// Get episodes for a series
export async function getEpisodes(
  config: SonarrConfig,
  seriesId: number,
  seasonNumber?: number,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<SonarrEpisode[]>> {
  let endpoint = `/episode?seriesId=${seriesId}`;
  if (seasonNumber !== undefined) {
    endpoint += `&seasonNumber=${seasonNumber}`;
  }

  const results = await makeRequest<SonarrEpisode[]>(config, endpoint);

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

// Get specific episode by ID
export function getEpisodeById(
  config: SonarrConfig,
  id: number,
): Promise<SonarrEpisode> {
  return makeRequest<SonarrEpisode>(config, `/episode/${id}`);
}

// Update episode monitoring
export async function updateEpisodeMonitoring(
  config: SonarrConfig,
  episodeIds: number[],
  monitored: boolean,
): Promise<void> {
  await makeRequest<void>(config, "/episode/monitor", {
    method: "PUT",
    body: JSON.stringify({
      episodeIds,
      monitored,
    }),
  });
}

// Get calendar
export async function getCalendar(
  config: SonarrConfig,
  start?: string,
  end?: string,
  includeSeries = false,
  includeEpisodeFile = false,
  limit?: number,
  skip?: number,
): Promise<PaginatedResponse<SonarrCalendarItem[]>> {
  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end) params.append("end", end);
  if (includeSeries) params.append("includeSeries", "true");
  if (includeEpisodeFile) params.append("includeEpisodeFile", "true");

  const queryString = params.toString();
  const endpoint = `/calendar${queryString ? `?${queryString}` : ""}`;

  const results = await makeRequest<SonarrCalendarItem[]>(config, endpoint);

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

// Get queue
export async function getQueue(
  config: SonarrConfig,
  limit?: number,
  skip?: number,
): Promise<SonarrQueueItem[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append("pageSize", limit.toString());
  if (skip !== undefined) {
    params.append("page", Math.floor(skip / (limit || 20) + 1).toString());
  }

  const queryString = params.toString();
  const endpoint = `/queue${queryString ? `?${queryString}` : ""}`;

  const response = await makeRequest<SonarrQueueResponse>(config, endpoint);
  return response.records;
}

// Get quality profiles
export function getQualityProfiles(
  config: SonarrConfig,
): Promise<SonarrQualityProfile[]> {
  return makeRequest<SonarrQualityProfile[]>(config, "/qualityProfile");
}

// Get root folders
export function getRootFolders(
  config: SonarrConfig,
): Promise<SonarrRootFolder[]> {
  return makeRequest<SonarrRootFolder[]>(config, "/rootFolder");
}

// Get system status
export function getSystemStatus(
  config: SonarrConfig,
): Promise<SonarrSystemStatus> {
  return makeRequest<SonarrSystemStatus>(config, "/system/status");
}

// Get health
export function getHealth(config: SonarrConfig): Promise<SonarrHealth[]> {
  return makeRequest<SonarrHealth[]>(config, "/health");
}

// Refresh series
export async function refreshSeries(
  config: SonarrConfig,
  id: number,
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RefreshSeries",
      seriesId: id,
    }),
  });
}

// Refresh all series
export async function refreshAllSeries(config: SonarrConfig): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RefreshSeries",
    }),
  });
}

// Search for series episodes
export async function searchSeriesEpisodes(
  config: SonarrConfig,
  id: number,
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "SeriesSearch",
      seriesId: id,
    }),
  });
}

// Search for specific episodes
export async function searchEpisodes(
  config: SonarrConfig,
  episodeIds: number[],
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "EpisodeSearch",
      episodeIds,
    }),
  });
}

// Search for season episodes
export async function searchSeason(
  config: SonarrConfig,
  seriesId: number,
  seasonNumber: number,
): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "SeasonSearch",
      seriesId,
      seasonNumber,
    }),
  });
}

// Scan disk for series
export async function diskScan(config: SonarrConfig): Promise<void> {
  await makeRequest<void>(config, "/command", {
    method: "POST",
    body: JSON.stringify({
      name: "RescanSeries",
    }),
  });
}

// Test connection
export async function testConnection(
  config: SonarrConfig,
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
