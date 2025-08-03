import type {
  RadarrMovie,
  RadarrQualityProfile,
  RadarrQueueItem,
  RadarrSearchResult,
  RadarrSystemStatus,
  RadarrHealth,
  RadarrRootFolder,
  RadarrAddMovieOptions,
} from '../types/radarr.ts';

export class RadarrClient {
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
          `Radarr API request failed: ${response.status} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Radarr API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Search for movies
  searchMovie(term: string): Promise<RadarrSearchResult[]> {
    return this.makeRequest<RadarrSearchResult[]>(
      `/movie/lookup?term=${encodeURIComponent(term)}`,
    );
  }

  // Get all movies
  getMovies(): Promise<RadarrMovie[]> {
    return this.makeRequest<RadarrMovie[]>('/movie');
  }

  // Get specific movie by ID
  getMovie(id: number): Promise<RadarrMovie> {
    return this.makeRequest<RadarrMovie>(`/movie/${id}`);
  }

  // Add a movie
  addMovie(options: RadarrAddMovieOptions): Promise<RadarrMovie> {
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

    return this.makeRequest<RadarrMovie>('/movie', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Update a movie
  updateMovie(movie: RadarrMovie): Promise<RadarrMovie> {
    return this.makeRequest<RadarrMovie>(`/movie/${movie.id}`, {
      method: 'PUT',
      body: JSON.stringify(movie),
    });
  }

  // Delete a movie
  async deleteMovie(
    id: number,
    deleteFiles = false,
    addImportExclusion = false,
  ): Promise<void> {
    const params = new URLSearchParams();
    if (deleteFiles) params.append('deleteFiles', 'true');
    if (addImportExclusion) params.append('addImportExclusion', 'true');

    const queryString = params.toString();
    const endpoint = `/movie/${id}${queryString ? `?${queryString}` : ''}`;

    await this.makeRequest<void>(endpoint, {
      method: 'DELETE',
    });
  }

  // Get queue
  getQueue(): Promise<RadarrQueueItem[]> {
    return this.makeRequest<RadarrQueueItem[]>('/queue');
  }

  // Get quality profiles
  getQualityProfiles(): Promise<RadarrQualityProfile[]> {
    return this.makeRequest<RadarrQualityProfile[]>('/qualityProfile');
  }

  // Get root folders
  getRootFolders(): Promise<RadarrRootFolder[]> {
    return this.makeRequest<RadarrRootFolder[]>('/rootFolder');
  }

  // Get system status
  getSystemStatus(): Promise<RadarrSystemStatus> {
    return this.makeRequest<RadarrSystemStatus>('/system/status');
  }

  // Get health
  getHealth(): Promise<RadarrHealth[]> {
    return this.makeRequest<RadarrHealth[]>('/health');
  }

  // Refresh movie
  async refreshMovie(id: number): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshMovie',
        movieId: id,
      }),
    });
  }

  // Refresh all movies
  async refreshAllMovies(): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshMovie',
      }),
    });
  }

  // Search for movie releases
  async searchMovieReleases(id: number): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'MoviesSearch',
        movieIds: [id],
      }),
    });
  }

  // Scan disk for movies
  async diskScan(): Promise<void> {
    await this.makeRequest<void>('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RescanMovie',
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