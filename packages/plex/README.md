# @wyattjoh/plex

A TypeScript client library for the Plex Media Server API, providing a clean and type-safe interface for managing media libraries.

## Features

- 🎬 Complete Plex Media Server API support
- 📝 Full TypeScript support with comprehensive types
- 🔍 Search across all media libraries with type filtering
- 📚 Library management and metadata access
- 🔄 Server capabilities and library refresh operations
- ⚡ Functional programming approach (no classes)
- 🛡️ Built-in connection testing and error handling

## Installation

```bash
deno add @wyattjoh/plex
```

## Quick Start

```typescript
import {
  createPlexConfig,
  getLibraries,
  getMetadata,
  search,
  testConnection,
} from "@wyattjoh/plex";

// Create configuration
const config = createPlexConfig(
  "http://localhost:32400",
  "your-plex-token",
);

// Test connection
const result = await testConnection(config);
if (!result.success) {
  throw new Error(`Connection failed: ${result.error}`);
}

// Get all libraries
const libraries = await getLibraries(config);

// Search across all libraries
const searchResults = await search(config, "The Matrix", 10, ["movies"]);

// Get detailed metadata
const metadata = await getMetadata(config, "12345");

// Refresh a library
await refreshLibrary(config, "1");
```

## License

MIT
