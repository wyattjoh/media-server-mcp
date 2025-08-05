import type { RadarrMovie } from "../types/radarr.ts";
import type { SonarrSeries } from "../types/sonarr.ts";
import type {
  RadarrMovieFilters,
  RadarrMovieSortField,
  SonarrSeriesFilters,
  SonarrSeriesSortField,
  SortOptions,
} from "../types/filters.ts";

// Generic filter function for title matching (case-insensitive partial match)
export function filterByTitle<T extends { title: string }>(
  items: T[],
  title: string | undefined,
): T[] {
  if (!title) return items;
  const lowerTitle = title.toLowerCase();
  return items.filter((item) => item.title.toLowerCase().includes(lowerTitle));
}

// Generic filter function for genre matching
export function filterByGenres<T extends { genres?: string[] }>(
  items: T[],
  genres: string[] | undefined,
  matchAll = false,
): T[] {
  if (!genres || genres.length === 0) return items;

  return items.filter((item) => {
    if (!item.genres || item.genres.length === 0) return false;

    if (matchAll) {
      // All specified genres must be present
      return genres.every((genre) => item.genres!.includes(genre));
    } else {
      // At least one genre must match
      return genres.some((genre) => item.genres!.includes(genre));
    }
  });
}

// Generic filter function for year range
export function filterByYearRange<T extends { year: number }>(
  items: T[],
  yearFrom: number | undefined,
  yearTo: number | undefined,
): T[] {
  return items.filter((item) => {
    if (yearFrom !== undefined && item.year < yearFrom) return false;
    if (yearTo !== undefined && item.year > yearTo) return false;
    return true;
  });
}

// Generic filter function for tags
export function filterByTags<T extends { tags?: number[] }>(
  items: T[],
  tags: number[] | undefined,
  matchAll = false,
): T[] {
  if (!tags || tags.length === 0) return items;

  return items.filter((item) => {
    if (!item.tags || item.tags.length === 0) return false;

    if (matchAll) {
      // All specified tags must be present
      return tags.every((tag) => item.tags!.includes(tag));
    } else {
      // At least one tag must match
      return tags.some((tag) => item.tags!.includes(tag));
    }
  });
}

// Generic sort function
export function sortResults<T, K extends keyof T>(
  items: T[],
  sortOptions: SortOptions<K> | undefined,
): T[] {
  if (!sortOptions) return items;

  const { field, direction } = sortOptions;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];

    // Handle undefined/null values
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

    // Compare based on type
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * multiplier;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * multiplier;
    }

    // For other types, convert to string and compare
    return String(aValue).localeCompare(String(bValue)) * multiplier;
  });
}

// Apply Radarr movie filters
export function applyRadarrMovieFilters(
  movies: RadarrMovie[],
  filters: RadarrMovieFilters | undefined,
): RadarrMovie[] {
  if (!filters) return movies;

  let filtered = movies;

  // Apply title filter
  filtered = filterByTitle(filtered, filters.title);

  // Apply genre filter
  filtered = filterByGenres(filtered, filters.genres);

  // Apply year range filter
  filtered = filterByYearRange(filtered, filters.yearFrom, filters.yearTo);

  // Apply monitored filter
  if (filters.monitored !== undefined) {
    filtered = filtered.filter((movie) =>
      movie.monitored === filters.monitored
    );
  }

  // Apply hasFile filter
  if (filters.hasFile !== undefined) {
    filtered = filtered.filter((movie) => movie.hasFile === filters.hasFile);
  }

  // Apply quality profile filter
  if (filters.qualityProfileId !== undefined) {
    filtered = filtered.filter(
      (movie) => movie.qualityProfileId === filters.qualityProfileId,
    );
  }

  // Apply minimum availability filter
  if (filters.minimumAvailability !== undefined) {
    filtered = filtered.filter(
      (movie) => movie.minimumAvailability === filters.minimumAvailability,
    );
  }

  // Apply tags filter
  filtered = filterByTags(filtered, filters.tags);

  // Apply IMDB ID filter
  if (filters.imdbId !== undefined) {
    filtered = filtered.filter((movie) => movie.imdbId === filters.imdbId);
  }

  // Apply TMDB ID filter
  if (filters.tmdbId !== undefined) {
    filtered = filtered.filter((movie) => movie.tmdbId === filters.tmdbId);
  }

  return filtered;
}

// Apply Sonarr series filters
export function applySonarrSeriesFilters(
  series: SonarrSeries[],
  filters: SonarrSeriesFilters | undefined,
): SonarrSeries[] {
  if (!filters) return series;

  let filtered = series;

  // Apply title filter
  filtered = filterByTitle(filtered, filters.title);

  // Apply genre filter
  filtered = filterByGenres(filtered, filters.genres);

  // Apply year range filter
  filtered = filterByYearRange(filtered, filters.yearFrom, filters.yearTo);

  // Apply monitored filter
  if (filters.monitored !== undefined) {
    filtered = filtered.filter((s) => s.monitored === filters.monitored);
  }

  // Apply network filter
  if (filters.network !== undefined) {
    const lowerNetwork = filters.network.toLowerCase();
    filtered = filtered.filter(
      (s) => s.network?.toLowerCase().includes(lowerNetwork),
    );
  }

  // Apply series type filter
  if (filters.seriesType !== undefined) {
    filtered = filtered.filter((s) => s.seriesType === filters.seriesType);
  }

  // Apply quality profile filter
  if (filters.qualityProfileId !== undefined) {
    filtered = filtered.filter(
      (s) => s.qualityProfileId === filters.qualityProfileId,
    );
  }

  // Apply status filter
  if (filters.status !== undefined) {
    filtered = filtered.filter((s) => s.status === filters.status);
  }

  // Apply tags filter
  filtered = filterByTags(filtered, filters.tags);

  // Apply IMDB ID filter
  if (filters.imdbId !== undefined) {
    filtered = filtered.filter((s) => s.imdbId === filters.imdbId);
  }

  // Apply TMDB ID filter
  if (filters.tmdbId !== undefined) {
    filtered = filtered.filter((s) => s.tmdbId === filters.tmdbId);
  }

  return filtered;
}

// Sort Radarr movies
export function sortRadarrMovies(
  movies: RadarrMovie[],
  sortOptions: SortOptions<RadarrMovieSortField> | undefined,
): RadarrMovie[] {
  if (!sortOptions) return movies;

  // Map sort field to actual property name if needed
  const fieldMap: Record<string, keyof RadarrMovie> = {
    sizeOnDisk: "sizeOnDisk",
    qualityProfileId: "qualityProfileId",
  };

  const actualField = (fieldMap[sortOptions.field] ||
    sortOptions.field) as keyof RadarrMovie;

  return sortResults(movies, { ...sortOptions, field: actualField });
}

// Sort Sonarr series
export function sortSonarrSeries(
  series: SonarrSeries[],
  sortOptions: SortOptions<SonarrSeriesSortField> | undefined,
): SonarrSeries[] {
  if (!sortOptions) return series;

  // For episodeCount, we need to use the statistics field
  if (sortOptions.field === "episodeCount") {
    const multiplier = sortOptions.direction === "asc" ? 1 : -1;
    return [...series].sort((a, b) => {
      const aCount = a.statistics?.episodeCount || 0;
      const bCount = b.statistics?.episodeCount || 0;
      return (aCount - bCount) * multiplier;
    });
  }

  // Map sort field to actual property name if needed
  const fieldMap: Record<string, keyof SonarrSeries> = {
    sizeOnDisk: "statistics",
    qualityProfileId: "qualityProfileId",
  };

  const actualField = (fieldMap[sortOptions.field] ||
    sortOptions.field) as keyof SonarrSeries;

  // Special handling for sizeOnDisk which is nested in statistics
  if (sortOptions.field === "sizeOnDisk") {
    const multiplier = sortOptions.direction === "asc" ? 1 : -1;
    return [...series].sort((a, b) => {
      const aSize = a.statistics?.sizeOnDisk || 0;
      const bSize = b.statistics?.sizeOnDisk || 0;
      return (aSize - bSize) * multiplier;
    });
  }

  return sortResults(series, { ...sortOptions, field: actualField });
}
