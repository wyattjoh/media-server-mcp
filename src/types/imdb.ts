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

// Cast member interface
export interface IMDBCastMember {
  readonly id: string;
  readonly name: string;
  readonly character: string | undefined;
  readonly image: string | undefined;
}

// Director interface
export interface IMDBDirector {
  readonly id: string;
  readonly name: string;
  readonly image: string | undefined;
}

// Writer interface
export interface IMDBWriter {
  readonly id: string;
  readonly name: string;
  readonly image: string | undefined;
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

// Popular movie interface
export interface IMDBPopularMovie {
  readonly id: string;
  readonly rank: string;
  readonly title: string;
  readonly fullTitle: string | undefined;
  readonly year: string | undefined;
  readonly image: string | undefined;
  readonly crew: string | undefined;
  readonly imDbRating: string | undefined;
  readonly imDbRatingCount: string | undefined;
}

// Popular TV show interface
export interface IMDBPopularTVShow {
  readonly id: string;
  readonly rank: string;
  readonly title: string;
  readonly fullTitle: string | undefined;
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

// Popular movies response wrapper
export interface IMDBPopularMoviesResponse {
  readonly items: IMDBPopularMovie[];
  readonly errorMessage: string | undefined;
}

// Popular TV shows response wrapper
export interface IMDBPopularTVShowsResponse {
  readonly items: IMDBPopularTVShow[];
  readonly errorMessage: string | undefined;
}

// Cast response wrapper
export interface IMDBCastResponse {
  readonly imDbId: string;
  readonly title: string;
  readonly fullTitle: string | undefined;
  readonly type: string;
  readonly year: string | undefined;
  readonly actors: IMDBCastMember[];
  readonly directors: IMDBDirector[];
  readonly writers: IMDBWriter[];
  readonly errorMessage: string | undefined;
}
