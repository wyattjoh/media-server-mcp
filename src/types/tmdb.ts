import { z } from "zod";

// TMDB tool schemas
export const TMDBFindByExternalIdSchema = z.object({
  externalId: z.string(),
  externalSource: z.string().optional(),
});

export const TMDBSearchMovieSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

export const TMDBSearchTVSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

export const TMDBSearchMultiSchema = z.object({
  query: z.string(),
  page: z.number().min(1).max(1000).optional(),
  language: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

export const TMDBDiscoverMoviesSchema = z.object({
  sort_by: z.string().optional(),
  page: z.number().min(1).max(1000).optional(),
  primary_release_year: z.number().optional(),
  release_date_gte: z.string().optional(),
  release_date_lte: z.string().optional(),
  vote_average_gte: z.number().min(0).max(10).optional(),
  vote_average_lte: z.number().min(0).max(10).optional(),
  vote_count_gte: z.number().min(0).optional(),
  with_genres: z.string().optional(),
  without_genres: z.string().optional(),
  with_original_language: z.string().optional(),
  with_runtime_gte: z.number().min(0).optional(),
  with_runtime_lte: z.number().min(0).optional(),
  certification_country: z.string().optional(),
  certification: z.string().optional(),
  include_adult: z.boolean().optional(),
  include_video: z.boolean().optional(),
  region: z.string().optional(),
  year: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

export const TMDBDiscoverTVSchema = z.object({
  sort_by: z.string().optional(),
  page: z.number().min(1).max(1000).optional(),
  first_air_date_year: z.number().optional(),
  first_air_date_gte: z.string().optional(),
  first_air_date_lte: z.string().optional(),
  vote_average_gte: z.number().min(0).max(10).optional(),
  vote_average_lte: z.number().min(0).max(10).optional(),
  vote_count_gte: z.number().min(0).optional(),
  with_genres: z.string().optional(),
  without_genres: z.string().optional(),
  with_original_language: z.string().optional(),
  with_runtime_gte: z.number().min(0).optional(),
  with_runtime_lte: z.number().min(0).optional(),
  with_networks: z.string().optional(),
  timezone: z.string().optional(),
  include_adult: z.boolean().optional(),
  screened_theatrically: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  skip: z.number().min(0).optional(),
});

export const TMDBGetGenresSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  language: z.string().optional(),
});

// TMDB API response interfaces

// Basic movie interface
export interface TMDBMovie {
  readonly id: number;
  readonly title: string;
  readonly original_title: string;
  readonly overview: string | undefined;
  readonly poster_path: string | undefined;
  readonly backdrop_path: string | undefined;
  readonly release_date: string | undefined;
  readonly original_language: string;
  readonly genre_ids: number[];
  readonly adult: boolean;
  readonly video: boolean;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly popularity: number;
  readonly media_type?: "movie";
}

// Basic TV show interface
export interface TMDBTV {
  readonly id: number;
  readonly name: string;
  readonly original_name: string;
  readonly overview: string | undefined;
  readonly poster_path: string | undefined;
  readonly backdrop_path: string | undefined;
  readonly first_air_date: string | undefined;
  readonly original_language: string;
  readonly genre_ids: number[];
  readonly adult: boolean;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly popularity: number;
  readonly origin_country: string[];
  readonly media_type?: "tv";
}

// Basic person interface
export interface TMDBPerson {
  readonly id: number;
  readonly name: string;
  readonly original_name: string;
  readonly popularity: number;
  readonly profile_path: string | undefined;
  readonly adult: boolean;
  readonly gender: number;
  readonly known_for_department: string;
  readonly known_for: (TMDBMovie | TMDBTV)[];
  readonly media_type?: "person";
}

// Multi search result type
export type TMDBMultiResult = TMDBMovie | TMDBTV | TMDBPerson;

// Search response interfaces
export interface TMDBSearchResponse<T> {
  readonly page: number;
  readonly results: T[];
  readonly total_pages: number;
  readonly total_results: number;
}

// Movie search response
export type TMDBMovieSearchResponse = TMDBSearchResponse<TMDBMovie>;

// TV search response
export type TMDBTVSearchResponse = TMDBSearchResponse<TMDBTV>;

// Multi search response
export type TMDBMultiSearchResponse = TMDBSearchResponse<TMDBMultiResult>;

// Find by external ID response
export interface TMDBFindResponse {
  readonly movie_results: TMDBMovie[];
  readonly person_results: TMDBPerson[];
  readonly tv_results: TMDBTV[];
  readonly tv_episode_results: unknown[];
  readonly tv_season_results: unknown[];
}

// Discover options interface
export interface TMDBDiscoverMovieOptions {
  readonly sort_by?: string;
  readonly page?: number;
  readonly primary_release_year?: number;
  readonly release_date_gte?: string;
  readonly release_date_lte?: string;
  readonly vote_average_gte?: number;
  readonly vote_average_lte?: number;
  readonly vote_count_gte?: number;
  readonly with_genres?: string;
  readonly with_keywords?: string;
  readonly without_genres?: string;
  readonly with_original_language?: string;
  readonly with_runtime_gte?: number;
  readonly with_runtime_lte?: number;
  readonly certification_country?: string;
  readonly certification?: string;
  readonly include_adult?: boolean;
  readonly include_video?: boolean;
  readonly region?: string;
  readonly year?: number;
}

export interface TMDBDiscoverTVOptions {
  readonly sort_by?: string;
  readonly page?: number;
  readonly first_air_date_year?: number;
  readonly first_air_date_gte?: string;
  readonly first_air_date_lte?: string;
  readonly vote_average_gte?: number;
  readonly vote_average_lte?: number;
  readonly vote_count_gte?: number;
  readonly with_genres?: string;
  readonly with_keywords?: string;
  readonly without_genres?: string;
  readonly with_original_language?: string;
  readonly with_runtime_gte?: number;
  readonly with_runtime_lte?: number;
  readonly with_networks?: string;
  readonly timezone?: string;
  readonly include_adult?: boolean;
  readonly screened_theatrically?: boolean;
}

// Discover response types
export type TMDBDiscoverMovieResponse = TMDBSearchResponse<TMDBMovie>;
export type TMDBDiscoverTVResponse = TMDBSearchResponse<TMDBTV>;

// Genre interface
export interface TMDBGenre {
  readonly id: number;
  readonly name: string;
}

// Genres response interface
export interface TMDBGenresResponse {
  readonly genres: TMDBGenre[];
}

// Configuration response interface
export interface TMDBConfiguration {
  readonly images: {
    readonly base_url: string;
    readonly secure_base_url: string;
    readonly backdrop_sizes: string[];
    readonly logo_sizes: string[];
    readonly poster_sizes: string[];
    readonly profile_sizes: string[];
    readonly still_sizes: string[];
  };
  readonly change_keys: string[];
}

// Production companies interface
export interface TMDBProductionCompany {
  readonly id: number;
  readonly logo_path: string | undefined;
  readonly name: string;
  readonly origin_country: string;
}

// Production countries interface
export interface TMDBProductionCountry {
  readonly iso_3166_1: string;
  readonly name: string;
}

// Spoken languages interface
export interface TMDBSpokenLanguage {
  readonly english_name: string;
  readonly iso_639_1: string;
  readonly name: string;
}

// Collection interface
export interface TMDBCollection {
  readonly id: number;
  readonly name: string;
  readonly poster_path: string | undefined;
  readonly backdrop_path: string | undefined;
}

// Cast member interface
export interface TMDBCastMember {
  readonly adult: boolean;
  readonly gender: number | undefined;
  readonly id: number;
  readonly known_for_department: string;
  readonly name: string;
  readonly original_name: string;
  readonly popularity: number;
  readonly profile_path: string | undefined;
  readonly cast_id: number;
  readonly character: string;
  readonly credit_id: string;
  readonly order: number;
}

// Crew member interface
export interface TMDBCrewMember {
  readonly adult: boolean;
  readonly gender: number | undefined;
  readonly id: number;
  readonly known_for_department: string;
  readonly name: string;
  readonly original_name: string;
  readonly popularity: number;
  readonly profile_path: string | undefined;
  readonly credit_id: string;
  readonly department: string;
  readonly job: string;
}

// Credits interface
export interface TMDBCredits {
  readonly id: number;
  readonly cast: TMDBCastMember[];
  readonly crew: TMDBCrewMember[];
}

// TV show creator interface
export interface TMDBCreator {
  readonly id: number;
  readonly credit_id: string;
  readonly name: string;
  readonly gender: number | undefined;
  readonly profile_path: string | undefined;
}

// TV show network interface
export interface TMDBNetwork {
  readonly id: number;
  readonly logo_path: string | undefined;
  readonly name: string;
  readonly origin_country: string;
}

// TV show season interface
export interface TMDBSeason {
  readonly air_date: string | undefined;
  readonly episode_count: number;
  readonly id: number;
  readonly name: string;
  readonly overview: string;
  readonly poster_path: string | undefined;
  readonly season_number: number;
  readonly vote_average: number;
}

// Episode interface
export interface TMDBEpisode {
  readonly id: number;
  readonly name: string;
  readonly overview: string;
  readonly vote_average: number;
  readonly vote_count: number;
  readonly air_date: string | undefined;
  readonly episode_number: number;
  readonly production_code: string;
  readonly runtime: number | undefined;
  readonly season_number: number;
  readonly show_id: number;
  readonly still_path: string | undefined;
}

// Detailed movie interface with enriched data
export interface TMDBMovieDetails extends TMDBMovie {
  readonly belongs_to_collection: TMDBCollection | undefined;
  readonly budget: number;
  readonly genres: TMDBGenre[];
  readonly homepage: string | undefined;
  readonly imdb_id: string | undefined;
  readonly production_companies: TMDBProductionCompany[];
  readonly production_countries: TMDBProductionCountry[];
  readonly revenue: number;
  readonly runtime: number | undefined;
  readonly spoken_languages: TMDBSpokenLanguage[];
  readonly status: string;
  readonly tagline: string | undefined;
}

// Detailed TV show interface with enriched data
export interface TMDBTVDetails extends TMDBTV {
  readonly created_by: TMDBCreator[];
  readonly episode_run_time: number[];
  readonly genres: TMDBGenre[];
  readonly homepage: string | undefined;
  readonly in_production: boolean;
  readonly languages: string[];
  readonly last_air_date: string | undefined;
  readonly last_episode_to_air: TMDBEpisode | undefined;
  readonly next_episode_to_air: TMDBEpisode | undefined;
  readonly networks: TMDBNetwork[];
  readonly number_of_episodes: number;
  readonly number_of_seasons: number;
  readonly production_companies: TMDBProductionCompany[];
  readonly production_countries: TMDBProductionCountry[];
  readonly seasons: TMDBSeason[];
  readonly spoken_languages: TMDBSpokenLanguage[];
  readonly status: string;
  readonly tagline: string | undefined;
  readonly type: string;
}
