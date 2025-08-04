import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { IMDBConfig } from "../clients/imdb.ts";
import * as imdbClient from "../clients/imdb.ts";
import type { MCPToolResult } from "../types/mcp.ts";

export function createIMDBResources(): Resource[] {
  return [
    {
      uri: "imdb://lists/top-250",
      name: "Top 250 Movies",
      description: "IMDB Top 250 movies of all time",
      mimeType: "application/json",
    },
    {
      uri: "imdb://lists/popular-movies",
      name: "Popular Movies",
      description: "Currently popular movies on IMDB",
      mimeType: "application/json",
    },
    {
      uri: "imdb://lists/popular-tv",
      name: "Popular TV Shows",
      description: "Currently popular TV shows on IMDB",
      mimeType: "application/json",
    },
  ];
}

export async function handleIMDBResource(
  uri: string,
  config: IMDBConfig,
): Promise<MCPToolResult> {
  try {
    switch (uri) {
      case "imdb://lists/top-250": {
        const results = await imdbClient.getTopMovies(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "imdb://lists/popular-movies": {
        const results = await imdbClient.getPopularMovies(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "imdb://lists/popular-tv": {
        const results = await imdbClient.getPopularTVShows(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown IMDB resource: ${uri}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }],
      isError: true,
    };
  }
}
