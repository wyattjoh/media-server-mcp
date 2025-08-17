import type {
  RadarrMovie,
  RadarrMovieFilters,
  RadarrMovieSortField,
} from "./types.ts";
import type { SortOptions } from "./shared-types.ts";
import {
  filterByGenres,
  filterByTags,
  filterByTitle,
  filterByYearRange,
  sortResults,
} from "./filter-utils.ts";

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
