// IMDB API response interfaces

// Search result interface
export interface IMDBSearchResult {
  readonly id: string;
  readonly title: string;
  readonly year: string | undefined;
  readonly type: string;
  readonly poster: string | undefined;
}

// Detailed movie/show information
export interface IMDBMovieDetails {
  readonly id: string;
  readonly title: string;
  readonly year: string | undefined;
  readonly rating: string | undefined;
  readonly plot: string | undefined;
  readonly director: string | undefined;
  readonly writers: string | undefined;
  readonly stars: string | undefined;
  readonly genres: string | undefined;
  readonly language: string | undefined;
  readonly country: string | undefined;
  readonly runtime: string | undefined;
  readonly poster: string | undefined;
  readonly type: string;
  readonly imdbRating: string | undefined;
  readonly imdbVotes: string | undefined;
  readonly boxOffice: string | undefined;
  readonly production: string | undefined;
  readonly website: string | undefined;
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
