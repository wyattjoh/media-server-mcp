import type {
  SonarrAddSeriesOptions,
  SonarrCalendarItem,
  SonarrEpisode,
  SonarrHealth,
  SonarrQualityProfile,
  SonarrQueueItem,
  SonarrRootFolder,
  SonarrSearchResult,
  SonarrSeries,
  SonarrSystemStatus,
} from "../types/sonarr.ts";

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
      throw new Error(
        `Sonarr API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Sonarr API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Search for series
export function searchSeries(
  config: SonarrConfig,
  term: string,
): Promise<SonarrSearchResult[]> {
  return makeRequest<SonarrSearchResult[]>(
    config,
    `/series/lookup?term=${encodeURIComponent(term)}`,
  );
}

// Get all series
export function getSeries(config: SonarrConfig): Promise<SonarrSeries[]> {
  return makeRequest<SonarrSeries[]>(config, "/series");
}

// Get specific series by ID
export function getSeriesById(
  config: SonarrConfig,
  id: number,
): Promise<SonarrSeries> {
  return makeRequest<SonarrSeries>(config, `/series/${id}`);
}

// Add a series
export function addSeries(
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

  return makeRequest<SonarrSeries>(config, "/series", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
export function getEpisodes(
  config: SonarrConfig,
  seriesId: number,
  seasonNumber?: number,
): Promise<SonarrEpisode[]> {
  let endpoint = `/episode?seriesId=${seriesId}`;
  if (seasonNumber !== undefined) {
    endpoint += `&seasonNumber=${seasonNumber}`;
  }

  return makeRequest<SonarrEpisode[]>(config, endpoint);
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
export function getCalendar(
  config: SonarrConfig,
  start?: string,
  end?: string,
  includeSeries = false,
  includeEpisodeFile = false,
): Promise<SonarrCalendarItem[]> {
  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end) params.append("end", end);
  if (includeSeries) params.append("includeSeries", "true");
  if (includeEpisodeFile) params.append("includeEpisodeFile", "true");

  const queryString = params.toString();
  const endpoint = `/calendar${queryString ? `?${queryString}` : ""}`;

  return makeRequest<SonarrCalendarItem[]>(config, endpoint);
}

// Get queue
export function getQueue(config: SonarrConfig): Promise<SonarrQueueItem[]> {
  return makeRequest<SonarrQueueItem[]>(config, "/queue");
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
export async function testConnection(config: SonarrConfig): Promise<boolean> {
  try {
    await getSystemStatus(config);
    return true;
  } catch {
    return false;
  }
}
