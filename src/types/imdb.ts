import { z } from "zod";
import { PaginationSchema } from "./mcp.ts";

// IMDB tool schemas
export const IMDBSearchSchema = z.object({
  query: z.string().describe("Search query for movies/TV shows"),
}).merge(PaginationSchema);

export const IMDBIdSchema = z.object({
  imdbId: z.string().describe("IMDB ID (e.g., tt1234567)"),
});

export const IMDBCastSchema = z.object({
  imdbId: z.string().describe("IMDB ID (e.g., tt1234567)"),
}).merge(PaginationSchema);

export const IMDBPaginatedSchema = PaginationSchema;

// Search result interface - matches actual API response
export interface IMDBSearchResult {
  readonly id: string;
  readonly primaryTitle: string;
  readonly originalTitle: string;
  readonly startYear: number | undefined;
  readonly type: string;
  readonly description: string | undefined;
  readonly primaryImage: string | undefined;
  readonly averageRating: number | undefined;
  readonly genres: string[] | undefined;
}

// Detailed movie/show information - matches actual API response
export interface IMDBMovieDetails {
  readonly id: string;
  readonly primaryTitle: string;
  readonly originalTitle: string;
  readonly startYear: number | undefined;
  readonly type: string;
  readonly description: string | undefined;
  readonly primaryImage: string | undefined;
  readonly averageRating: number | undefined;
  readonly genres: string[] | undefined;
  readonly runtimeMinutes: number | undefined;
  readonly contentRating: string | undefined;
  readonly releaseDate: string | undefined;
}

// Cast member interface - represents any cast member from the API
export interface IMDBCastMember {
  readonly id: string;
  readonly url: string;
  readonly fullName: string;
  readonly primaryImage: string | undefined;
  readonly thumbnails: Array<{
    readonly url: string;
    readonly width: number;
    readonly height: number;
  }>;
  readonly job: string; // "actor", "director", "writer", "producer", etc.
  readonly characters: string[] | undefined; // For actors
}

// Top movie interface
export interface IMDBTopMovie {
  readonly id: string;
  readonly rank: string;
  readonly title: string;
  readonly year: string | undefined;
  readonly image: string | undefined;
  readonly crew: string | undefined;
  readonly imDbRating: string | undefined;
  readonly imDbRatingCount: string | undefined;
}

// Search response wrapper
export interface IMDBSearchResponse {
  readonly searchType: string;
  readonly expression: string;
  readonly results: IMDBSearchResult[];
  readonly errorMessage: string | undefined;
}

// Top movies response wrapper
export interface IMDBTopMoviesResponse {
  readonly items: IMDBTopMovie[];
  readonly errorMessage: string | undefined;
}

// Popular movies response (direct array from API)
export type IMDBPopularMoviesResponse = IMDBMovieDetails[];

// Popular TV shows response (direct array from API)
export type IMDBPopularTVShowsResponse = IMDBMovieDetails[];

// Cast response - API returns a flat array of cast members
export type IMDBCastResponse = IMDBCastMember[];
