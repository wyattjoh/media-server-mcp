import { z } from "zod";

// Common sort direction
export type SortDirection = "asc" | "desc";

// Common sort options interface
export interface SortOptions<T> {
  field: T;
  direction: SortDirection;
}

// Radarr movie filter options
export interface RadarrMovieFilters {
  title?: string | undefined;
  genres?: string[] | undefined;
  yearFrom?: number | undefined;
  yearTo?: number | undefined;
  monitored?: boolean | undefined;
  hasFile?: boolean | undefined;
  qualityProfileId?: number | undefined;
  tags?: number[] | undefined;
  minimumAvailability?: string | undefined;
  imdbId?: string | undefined;
  tmdbId?: number | undefined;
}

// Radarr movie sort fields
export type RadarrMovieSortField =
  | "title"
  | "year"
  | "added"
  | "sizeOnDisk"
  | "qualityProfileId"
  | "runtime";

// Sonarr series filter options
export interface SonarrSeriesFilters {
  title?: string | undefined;
  genres?: string[] | undefined;
  yearFrom?: number | undefined;
  yearTo?: number | undefined;
  monitored?: boolean | undefined;
  network?: string | undefined;
  seriesType?: string | undefined;
  qualityProfileId?: number | undefined;
  tags?: number[] | undefined;
  status?: string | undefined;
  imdbId?: string | undefined;
  tmdbId?: number | undefined;
}

// Sonarr series sort fields
export type SonarrSeriesSortField =
  | "title"
  | "year"
  | "added"
  | "sizeOnDisk"
  | "qualityProfileId"
  | "runtime"
  | "episodeCount";

// Zod schemas for validation
export const RadarrMovieFiltersSchema = z.object({
  title: z.string().optional(),
  genres: z.array(z.string()).optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  monitored: z.boolean().optional(),
  hasFile: z.boolean().optional(),
  qualityProfileId: z.number().optional(),
  tags: z.array(z.number()).optional(),
  minimumAvailability: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.number().optional(),
});

export const RadarrMovieSortSchema = z.object({
  field: z.enum([
    "title",
    "year",
    "added",
    "sizeOnDisk",
    "qualityProfileId",
    "runtime",
  ]),
  direction: z.enum(["asc", "desc"]),
});

export const SonarrSeriesFiltersSchema = z.object({
  title: z.string().optional(),
  genres: z.array(z.string()).optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  monitored: z.boolean().optional(),
  network: z.string().optional(),
  seriesType: z.string().optional(),
  qualityProfileId: z.number().optional(),
  tags: z.array(z.number()).optional(),
  status: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.number().optional(),
});

export const SonarrSeriesSortSchema = z.object({
  field: z.enum([
    "title",
    "year",
    "added",
    "sizeOnDisk",
    "qualityProfileId",
    "runtime",
    "episodeCount",
  ]),
  direction: z.enum(["asc", "desc"]),
});
