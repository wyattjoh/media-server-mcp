# @wyattjoh/tmdb

A TypeScript client library for The Movie Database (TMDB) API, providing comprehensive access to movie, TV show, and people data.

## Features

- 🎬 Complete TMDB API support
- 📝 Full TypeScript support with comprehensive types
- 🔍 Search movies, TV shows, people, and collections
- 📊 Discovery tools with advanced filtering
- 🌟 Trending content and recommendations
- 🔗 External ID lookup (IMDB, TVDB, etc.)
- ⚡ Functional programming approach (no classes)
- 📄 Built-in pagination support

## Installation

```bash
deno add @wyattjoh/tmdb
```

## Quick Start

```typescript
import {
  createTMDBConfig,
  discoverMovies,
  getMovieDetails,
  getTrending,
  searchMovies,
} from "@wyattjoh/tmdb";

// Create configuration
const config = createTMDBConfig("your-tmdb-api-key");

// Search for movies
const movies = await searchMovies(config, { query: "Inception" });

// Get movie details
const movie = await getMovieDetails(config, { movieId: 27205 });

// Discover movies with filters
const discoveries = await discoverMovies(config, {
  with_genres: "28,12", // Action, Adventure
  primary_release_year: 2023,
  vote_average_gte: 7.0,
});

// Get trending content
const trending = await getTrending(config, {
  mediaType: "movie",
  timeWindow: "week",
});
```

## License

MIT
