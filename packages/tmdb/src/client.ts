import type {
  TMDBCertificationsResponse,
  TMDBCollectionDetails,
  TMDBConfiguration,
  TMDBCountry,
  TMDBCredits,
  TMDBDiscoverMovieOptions,
  TMDBDiscoverMovieResponse,
  TMDBDiscoverTVOptions,
  TMDBDiscoverTVResponse,
  TMDBFindResponse,
  TMDBGenresResponse,
  TMDBKeywordSearchResponse,
  TMDBLanguage,
  TMDBMovieDetails,
  TMDBMovieSearchResponse,
  TMDBMultiSearchResponse,
  TMDBPeopleSearchResponse,
  TMDBPersonDetails,
  TMDBPersonMovieCredits,
  TMDBPersonTVCredits,
  TMDBSearchResponse,
  TMDBTVDetails,
  TMDBTVSearchResponse,
  TMDBWatchProvidersResponse,
} from "./types.ts";
import type { PaginatedResponse } from "./mcp.ts";

export interface TMDBConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createTMDBConfig(apiKey: string): TMDBConfig {
  return {
    baseUrl: "https://api.themoviedb.org/3",
    apiKey,
  };
}

async function makeRequest<T>(
  config: TMDBConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;

  const headers = {
    "accept": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `TMDB API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `TMDB API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// Find content by external ID (TVDB ID, etc.)
export function findByExternalId(
  config: TMDBConfig,
  externalId: string,
  externalSource = "imdb_id",
): Promise<TMDBFindResponse> {
  return makeRequest<TMDBFindResponse>(
    config,
    `/find/${externalId}?external_source=${externalSource}`,
  );
}

// Search for movies
export function searchMovies(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/search/movie?${params.toString()}`,
  );
}

// Search for TV shows
export function searchTV(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/search/tv?${params.toString()}`,
  );
}

// Multi search (movies, TV shows, and people)
export function searchMulti(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<TMDBMultiSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMultiSearchResponse>(
    config,
    `/search/multi?${params.toString()}`,
  );
}

// Get popular movies
export function getPopularMovies(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/popular?${params.toString()}`,
  );
}

// Discover movies with advanced filtering
export function discoverMovies(
  config: TMDBConfig,
  options: TMDBDiscoverMovieOptions = {},
): Promise<TMDBDiscoverMovieResponse> {
  const params = new URLSearchParams();

  // Add all provided options to params
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value.toString());
    }
  });

  return makeRequest<TMDBDiscoverMovieResponse>(
    config,
    `/discover/movie?${params.toString()}`,
  );
}

// Discover TV shows with advanced filtering
export function discoverTV(
  config: TMDBConfig,
  options: TMDBDiscoverTVOptions = {},
): Promise<TMDBDiscoverTVResponse> {
  const params = new URLSearchParams();

  // Add all provided options to params
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value.toString());
    }
  });

  return makeRequest<TMDBDiscoverTVResponse>(
    config,
    `/discover/tv?${params.toString()}`,
  );
}

// Get movie genres
export function getMovieGenres(
  config: TMDBConfig,
  language = "en-US",
): Promise<TMDBGenresResponse> {
  return makeRequest<TMDBGenresResponse>(
    config,
    `/genre/movie/list?language=${language}`,
  );
}

// Get TV genres
export function getTVGenres(
  config: TMDBConfig,
  language = "en-US",
): Promise<TMDBGenresResponse> {
  return makeRequest<TMDBGenresResponse>(
    config,
    `/genre/tv/list?language=${language}`,
  );
}

// Get API configuration
export function getConfiguration(
  config: TMDBConfig,
): Promise<TMDBConfiguration> {
  return makeRequest<TMDBConfiguration>(config, "/configuration");
}

// Get detailed movie information
export function getMovieDetails(
  config: TMDBConfig,
  movieId: number,
): Promise<TMDBMovieDetails> {
  return makeRequest<TMDBMovieDetails>(config, `/movie/${movieId}`);
}

// Get detailed TV show information
export function getTVDetails(
  config: TMDBConfig,
  tvId: number,
): Promise<TMDBTVDetails> {
  return makeRequest<TMDBTVDetails>(config, `/tv/${tvId}`);
}

// Get movie credits (cast and crew)
export function getMovieCredits(
  config: TMDBConfig,
  movieId: number,
): Promise<TMDBCredits> {
  return makeRequest<TMDBCredits>(config, `/movie/${movieId}/credits`);
}

// Get TV show credits (cast and crew)
export function getTVCredits(
  config: TMDBConfig,
  tvId: number,
): Promise<TMDBCredits> {
  return makeRequest<TMDBCredits>(config, `/tv/${tvId}/credits`);
}

// Helper function to convert search results to paginated response
export function toPaginatedResponse<T>(
  searchResponse: {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
  },
  limit?: number,
  skip?: number,
): PaginatedResponse<T[]> {
  const startIndex = skip || 0;
  const endIndex = limit !== undefined ? startIndex + limit : undefined;
  const paginatedResults = searchResponse.results.slice(startIndex, endIndex);

  return {
    data: paginatedResults,
    total: searchResponse.total_results,
    returned: paginatedResults.length,
    skip: startIndex,
    limit,
  };
}

// Get trending content (movies, TV shows, or people)
export function getTrending(
  config: TMDBConfig,
  mediaType: "all" | "movie" | "tv" | "person",
  timeWindow: "day" | "week",
  page = 1,
  language = "en-US",
): Promise<TMDBSearchResponse<unknown>> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBSearchResponse<unknown>>(
    config,
    `/trending/${mediaType}/${timeWindow}?${params.toString()}`,
  );
}

// Get now playing movies
export function getNowPlayingMovies(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
  region?: string,
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  if (region) {
    params.set("region", region);
  }

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/now_playing?${params.toString()}`,
  );
}

// Get top rated movies
export function getTopRatedMovies(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
  region?: string,
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  if (region) {
    params.set("region", region);
  }

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/top_rated?${params.toString()}`,
  );
}

// Get upcoming movies
export function getUpcomingMovies(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
  region?: string,
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  if (region) {
    params.set("region", region);
  }

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/upcoming?${params.toString()}`,
  );
}

// Get popular TV shows
export function getPopularTV(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/popular?${params.toString()}`,
  );
}

// Get top rated TV shows
export function getTopRatedTV(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/top_rated?${params.toString()}`,
  );
}

// Get TV shows airing today
export function getAiringTodayTV(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
  timezone?: string,
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  if (timezone) {
    params.set("timezone", timezone);
  }

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/airing_today?${params.toString()}`,
  );
}

// Get TV shows on the air
export function getOnTheAirTV(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/on_the_air?${params.toString()}`,
  );
}

// Get movie recommendations
export function getMovieRecommendations(
  config: TMDBConfig,
  movieId: number,
  page = 1,
  language = "en-US",
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/${movieId}/recommendations?${params.toString()}`,
  );
}

// Get TV show recommendations
export function getTVRecommendations(
  config: TMDBConfig,
  tvId: number,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/${tvId}/recommendations?${params.toString()}`,
  );
}

// Get similar movies
export function getSimilarMovies(
  config: TMDBConfig,
  movieId: number,
  page = 1,
  language = "en-US",
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/movie/${movieId}/similar?${params.toString()}`,
  );
}

// Get similar TV shows
export function getSimilarTV(
  config: TMDBConfig,
  tvId: number,
  page = 1,
  language = "en-US",
): Promise<TMDBTVSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBTVSearchResponse>(
    config,
    `/tv/${tvId}/similar?${params.toString()}`,
  );
}

// Search for people
export function searchPeople(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
  includeAdult = false,
): Promise<TMDBPeopleSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
    include_adult: includeAdult.toString(),
  });

  return makeRequest<TMDBPeopleSearchResponse>(
    config,
    `/search/person?${params.toString()}`,
  );
}

// Get popular people
export function getPopularPeople(
  config: TMDBConfig,
  page = 1,
  language = "en-US",
): Promise<TMDBPeopleSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
  });

  return makeRequest<TMDBPeopleSearchResponse>(
    config,
    `/person/popular?${params.toString()}`,
  );
}

// Get person details
export function getPersonDetails(
  config: TMDBConfig,
  personId: number,
  language = "en-US",
  appendToResponse?: string,
): Promise<TMDBPersonDetails> {
  const params = new URLSearchParams({
    language,
  });

  if (appendToResponse) {
    params.set("append_to_response", appendToResponse);
  }

  return makeRequest<TMDBPersonDetails>(
    config,
    `/person/${personId}?${params.toString()}`,
  );
}

// Get person movie credits
export function getPersonMovieCredits(
  config: TMDBConfig,
  personId: number,
  language = "en-US",
): Promise<TMDBPersonMovieCredits> {
  const params = new URLSearchParams({
    language,
  });

  return makeRequest<TMDBPersonMovieCredits>(
    config,
    `/person/${personId}/movie_credits?${params.toString()}`,
  );
}

// Get person TV credits
export function getPersonTVCredits(
  config: TMDBConfig,
  personId: number,
  language = "en-US",
): Promise<TMDBPersonTVCredits> {
  const params = new URLSearchParams({
    language,
  });

  return makeRequest<TMDBPersonTVCredits>(
    config,
    `/person/${personId}/tv_credits?${params.toString()}`,
  );
}

// Search for collections
export function searchCollections(
  config: TMDBConfig,
  query: string,
  page = 1,
  language = "en-US",
): Promise<
  TMDBSearchResponse<
    {
      id: number;
      name: string;
      poster_path: string | undefined;
      backdrop_path: string | undefined;
    }
  >
> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
    language,
  });

  return makeRequest<
    TMDBSearchResponse<
      {
        id: number;
        name: string;
        poster_path: string | undefined;
        backdrop_path: string | undefined;
      }
    >
  >(
    config,
    `/search/collection?${params.toString()}`,
  );
}

// Get collection details
export function getCollectionDetails(
  config: TMDBConfig,
  collectionId: number,
  language = "en-US",
): Promise<TMDBCollectionDetails> {
  const params = new URLSearchParams({
    language,
  });

  return makeRequest<TMDBCollectionDetails>(
    config,
    `/collection/${collectionId}?${params.toString()}`,
  );
}

// Search for keywords
export function searchKeywords(
  config: TMDBConfig,
  query: string,
  page = 1,
): Promise<TMDBKeywordSearchResponse> {
  const params = new URLSearchParams({
    query,
    page: page.toString(),
  });

  return makeRequest<TMDBKeywordSearchResponse>(
    config,
    `/search/keyword?${params.toString()}`,
  );
}

// Get movies by keyword
export function getMoviesByKeyword(
  config: TMDBConfig,
  keywordId: number,
  page = 1,
  language = "en-US",
  includeAdult = false,
): Promise<TMDBMovieSearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    language,
    include_adult: includeAdult.toString(),
  });

  return makeRequest<TMDBMovieSearchResponse>(
    config,
    `/keyword/${keywordId}/movies?${params.toString()}`,
  );
}

// Get certifications for movies or TV shows
export function getCertifications(
  config: TMDBConfig,
  mediaType: "movie" | "tv",
): Promise<TMDBCertificationsResponse> {
  return makeRequest<TMDBCertificationsResponse>(
    config,
    `/certification/${mediaType}/list`,
  );
}

// Get watch providers for a movie or TV show
export function getWatchProviders(
  config: TMDBConfig,
  mediaType: "movie" | "tv",
  mediaId: number,
): Promise<TMDBWatchProvidersResponse> {
  return makeRequest<TMDBWatchProvidersResponse>(
    config,
    `/${mediaType}/${mediaId}/watch/providers`,
  );
}

// Get list of countries
export function getCountries(
  config: TMDBConfig,
  language = "en-US",
): Promise<TMDBCountry[]> {
  const params = new URLSearchParams({
    language,
  });

  return makeRequest<TMDBCountry[]>(
    config,
    `/configuration/countries?${params.toString()}`,
  );
}

// Get list of languages
export function getLanguages(
  config: TMDBConfig,
): Promise<TMDBLanguage[]> {
  return makeRequest<TMDBLanguage[]>(
    config,
    `/configuration/languages`,
  );
}

// Test connection to TMDB API
export async function testConnection(
  config: TMDBConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    await makeRequest<{ success: boolean }>(config, "/authentication");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
