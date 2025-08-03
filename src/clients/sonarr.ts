import type {
  SonarrSeries,
  SonarrEpisode,
  SonarrQualityProfile,
  SonarrQueueItem,
  SonarrSearchResult,
  SonarrCalendarItem,
  SonarrSystemStatus,
  SonarrHealth,
  SonarrRootFolder,
  SonarrAddSeriesOptions,
} from '../types/sonarr.ts';

export class SonarrClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v3${endpoint}`;
    const headers = {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
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
      throw new Error(`Sonarr API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Search for series
  searchSeries(term: string): Promise<SonarrSearchResult[]> {
    return this.makeRequest<SonarrSearchResult[]>(
      `/series/lookup?term=${encodeURIComponent(term)}`,
    );
  }

  // Get all series
  getSeries(): Promise<SonarrSeries[]> {
    return this.makeRequest<SonarrSeries[]>('/series');
  }

  // Get specific series by ID
  getSeriesById(id: number): Promise<SonarrSeries> {
    return this.makeRequest<SonarrSeries>(`/series/${id}`);
  }

  // Add a series
  addSeries(options: SonarrAddSeriesOptions): Promise<SonarrSeries> {
    const payload = {
      title: options.title,
      qualityProfileId: options.qualityProfileId,
      languageProfileId: options.languageProfileId ?? 1,
      monitored: options.monitored ?? true,
      tvdbId: options.tvdbId,
      rootFolderPath: options.rootFolderPath,
      seasonFolder: options.seasonFolder ?? true,
      seriesType: options.seriesType ?? 'standard',
      tags: options.tags ?? [],
      seasons: options.seasons ?? [],
      addOptions: {
        ignoreEpisodesWithFiles: options.addOptions?.ignoreEpisodesWithFiles ?? false,
        ignoreEpisodesWithoutFiles: options.addOptions?.ignoreEpisodesWithoutFiles ?? false,
        searchForMissingEpisodes: options.addOptions?.searchForMissingEpisodes ?? false,
      },
    };

    return this.makeRequest<SonarrSeries>('/series', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Update a series
  updateSeries(series: SonarrSeries): Promise<SonarrSeries> {
    return this.makeRequest<SonarrSeries>(`/series/${series.id}`, {
      method: 'PUT',
      body: JSON.stringify(series),
    });
  }

  // Delete a series
  async deleteSeries(
    id: number,
    deleteFiles = false,
    addImportExclusion = false,
  ): Promise<void> {
    const params = new URLSearchParams();
    if (deleteFiles) params.append('deleteFiles', 'true');
    if (addImportExclusion) params.append('addImportExclusion', 'true');

    const queryString = params.toString();
    const endpoint = `/series/${id}${queryString ? `?${queryString}` : ''}`;

    await this.makeRequest<void>(endpoint, {
      method: 'DELETE',
    });
  }

  // Get episodes for a series
  getEpisodes(
    seriesId: number,
    seasonNumber?: number,
  ): Promise<SonarrEpisode[]> {
    let endpoint = `/episode?seriesId=${seriesId}`;
    if (seasonNumber !== undefined) {
      endpoint += `&seasonNumber=${seasonNumber}`;
    }

    return this.makeRequest<SonarrEpisode[]>(endpoint);
  }

  // Get specific episode by ID
  getEpisodeById(id: number): Promise<SonarrEpisode> {
    return this.makeRequest<SonarrEpisode>(`/episode/${id}`);
  }

  // Update episode monitoring
  async updateEpisodeMonitoring(
    episodeIds: number[],
    monitored: boolean,
  ): Promise<void> {
    await this.makeRequest<void>('/episode/monitor', {
      method: 'PUT',
      body: JSON.stringify({
        episodeIds,
        monitored,
      }),
    });
  }

  // Get calendar
  getCalendar(
    start?: string,
    end?: string,
    includeSeries = false,
    includeEpisodeFile = false,
  ): Promise<SonarrCalendarItem[]> {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    if (includeSeries) params.append('includeSeries', 'true');
    if (includeEpisodeFile) params.append('includeEpisodeFile', 'true');

    const queryString = params.toString();
    const endpoint = `/calendar${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<SonarrCalendarItem[]>(endpoint);
  }

  // Get queue
  getQueue(): Promise<SonarrQueueItem[]> {
    return this.makeRequest<SonarrQueueItem[]>('/queue');
  }

  // Get quality profiles
  getQualityProfiles(): Promise<SonarrQualityProfile[]> {
    return this.makeRequest<SonarrQualityProfile[]>('/qualityProfile');
  }

  // Get root folders
  getRootFolders(): Promise<SonarrRootFolder[]> {
    return this.makeRequest<SonarrRootFolder[]>('/rootFolder');
  }

  // Get system status
  getSystemStatus(): Promise<SonarrSystemStatus> {
    return this.makeRequest<SonarrSystemStatus>('/system/status');
  }

  // Get health
  getHealth(): Promise<SonarrHealth[]> {
    return this.makeRequest<SonarrHealth[]>('/health');
  }

  // Refresh series
  async refreshSeries(id: number): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshSeries',
        seriesId: id,
      }),
    });
  }

  // Refresh all series
  async refreshAllSeries(): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshSeries',
      }),
    });
  }

  // Search for series episodes
  async searchSeriesEpisodes(id: number): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SeriesSearch',
        seriesId: id,
      }),
    });
  }

  // Search for specific episodes
  async searchEpisodes(episodeIds: number[]): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'EpisodeSearch',
        episodeIds,
      }),
    });
  }

  // Search for season episodes
  async searchSeason(seriesId: number, seasonNumber: number): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SeasonSearch',
        seriesId,
        seasonNumber,
      }),
    });
  }

  // Scan disk for series
  async diskScan(): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RescanSeries',
      }),
    });
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getSystemStatus();
      return true;
    } catch {
      return false;
    }
  }
}