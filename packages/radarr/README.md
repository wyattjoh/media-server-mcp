# @wyattjoh/radarr

A TypeScript client library for the Radarr API, providing a clean and type-safe interface for managing movies.

## Features

- 🎬 Complete Radarr API v3 support
- 📝 Full TypeScript support with comprehensive types
- 🔍 Advanced filtering and sorting capabilities
- ⚡ Functional programming approach (no classes)
- 🛡️ Built-in validation error handling
- 🔧 Configurable with environment variables

## Installation

```bash
deno add @wyattjoh/radarr
```

## Quick Start

```typescript
import {
  addMovie,
  createRadarrConfig,
  getMovies,
  searchMovies,
} from "@wyattjoh/radarr";

// Create configuration
const config = createRadarrConfig(
  "http://localhost:7878",
  "your-api-key",
);

// Search for movies
const searchResults = await searchMovies(config, { term: "Inception" });

// Get all movies with filtering
const movies = await getMovies(config, {
  filters: { hasFile: true },
  sort: { field: "title", direction: "asc" },
});

// Add a movie
await addMovie(config, {
  tmdbId: 27205,
  title: "Inception",
  year: 2010,
  qualityProfileId: 1,
  rootFolderPath: "/movies",
  minimumAvailability: "released",
});
```

## License

MIT
