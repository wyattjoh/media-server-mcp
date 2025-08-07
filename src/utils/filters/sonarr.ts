import type {
  SonarrSeries,
  SonarrSeriesFilters,
  SonarrSeriesSortField,
} from "../../types/sonarr.ts";
import type { SortOptions } from "../../types/filters.ts";
import {
  filterByGenres,
  filterByTags,
  filterByTitle,
  filterByYearRange,
  sortResults,
} from "./utils.ts";

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
