import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import * as tmdbClient from "@wyattjoh/tmdb";

export function createTMDBResources(
  server: McpServer,
  config: Readonly<TMDBConfig>,
): void {
  // Static resource: config://tmdb
  server.registerResource(
    "tmdb-config",
    "config://tmdb",
    {
      description:
        "TMDB API configuration including image base URLs and supported sizes",
      mimeType: "application/json",
    },
    async (uri) => {
      const configuration = await tmdbClient.getConfiguration(config);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(configuration),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Static resource: tmdb://genres/movies
  server.registerResource(
    "tmdb-genres-movies",
    "tmdb://genres/movies",
    {
      description: "List of movie genres available on TMDB",
      mimeType: "application/json",
    },
    async (uri) => {
      const genres = await tmdbClient.getMovieGenres(config);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(genres),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Static resource: tmdb://genres/tv
  server.registerResource(
    "tmdb-genres-tv",
    "tmdb://genres/tv",
    {
      description: "List of TV show genres available on TMDB",
      mimeType: "application/json",
    },
    async (uri) => {
      const genres = await tmdbClient.getTVGenres(config);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(genres),
          mimeType: "application/json",
        }],
      };
    },
  );
}
