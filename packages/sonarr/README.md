# @wyattjoh/sonarr

A TypeScript client library for the Sonarr API, providing a clean and type-safe interface for managing TV series.

## Features

- 📺 Complete Sonarr API v3 support
- 📝 Full TypeScript support with comprehensive types
- 🔍 Advanced filtering and sorting capabilities
- ⚡ Functional programming approach (no classes)
- 🛡️ Built-in validation error handling
- 📅 Episode and season management
- 🔧 Configurable with environment variables

## Installation

```bash
deno add @wyattjoh/sonarr
```

## Quick Start

```typescript
import {
  addSeries,
  createSonarrConfig,
  getSeries,
  searchSeries,
} from "@wyattjoh/sonarr";

// Create configuration
const config = createSonarrConfig(
  "http://localhost:8989",
  "your-api-key",
);

// Search for TV series
const searchResults = await searchSeries(config, { term: "Breaking Bad" });

// Get all series with filtering
const series = await getSeries(config, {
  filters: { monitored: true },
  sort: { field: "title", direction: "asc" },
});

// Add a series
await addSeries(config, {
  tvdbId: 81189,
  title: "Breaking Bad",
  qualityProfileId: 1,
  rootFolderPath: "/tv",
  seasons: [
    { seasonNumber: 1, monitored: true },
    { seasonNumber: 2, monitored: true },
  ],
});
```

## License

MIT
