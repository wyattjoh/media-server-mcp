import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { IMDBConfig } from "../clients/imdb.ts";
import * as imdbClient from "../clients/imdb.ts";
import type { MCPToolResult } from "../types/mcp.ts";
import {
  IMDBCastSchema,
  IMDBIdSchema,
  IMDBSearchSchema,
} from "../types/mcp.ts";

export function createIMDBTools(): Tool[] {
  return [
    {
      name: "imdb_search",
      description: "Search for movies and TV shows on IMDB",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for movies/TV shows",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "imdb_get_details",
      description: "Get detailed information about a movie or TV show",
      inputSchema: {
        type: "object",
        properties: {
          imdbId: {
            type: "string",
            description: "IMDB ID (e.g., tt1234567)",
          },
        },
        required: ["imdbId"],
      },
    },
    {
      name: "imdb_get_cast",
      description: "Get cast information for a movie or TV show",
      inputSchema: {
        type: "object",
        properties: {
          imdbId: {
            type: "string",
            description: "IMDB ID (e.g., tt1234567)",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return",
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
          },
        },
        required: ["imdbId"],
      },
    },
  ];
}

export async function handleIMDBTool(
  name: string,
  args: unknown,
  config: IMDBConfig,
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case "imdb_search": {
        const { query, limit, skip } = IMDBSearchSchema.parse(args);
        const results = await imdbClient.searchIMDB(config, query, limit, skip);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "imdb_get_details": {
        const { imdbId } = IMDBIdSchema.parse(args);
        const result = await imdbClient.getIMDBDetails(config, imdbId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "imdb_get_cast": {
        const { imdbId, limit, skip } = IMDBCastSchema.parse(args);
        const result = await imdbClient.getCast(config, imdbId, limit, skip);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown IMDB tool: ${name}`);
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
