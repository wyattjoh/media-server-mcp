import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { RadarrConfig } from "../clients/radarr.ts";
import * as radarrClient from "../clients/radarr.ts";
import type { MCPToolResult } from "../types/mcp.ts";
import {
  RadarrAddMovieSchema,
  RadarrMovieIdSchema,
  RadarrPaginatedSchema,
  RadarrSearchSchema,
} from "../types/mcp.ts";

export function createRadarrTools(): Tool[] {
  return [
    {
      name: "radarr_search_movie",
      description: "Search for movies in The Movie Database via Radarr",
      inputSchema: {
        type: "object",
        properties: {
          term: {
            type: "string",
            description: "Movie title to search for",
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
        required: ["term"],
      },
    },
    {
      name: "radarr_add_movie",
      description: "Add a movie to Radarr",
      inputSchema: {
        type: "object",
        properties: {
          tmdbId: {
            type: "number",
            description: "The Movie Database ID",
          },
          title: {
            type: "string",
            description: "Movie title",
          },
          year: {
            type: "number",
            description: "Movie release year",
          },
          qualityProfileId: {
            type: "number",
            description: "Quality profile ID to use",
          },
          rootFolderPath: {
            type: "string",
            description: "Root folder path where movie should be stored",
          },
          minimumAvailability: {
            type: "string",
            enum: ["tba", "announced", "inCinemas", "released", "preDB"],
            description: "Minimum availability for monitoring",
          },
          monitored: {
            type: "boolean",
            description: "Whether to monitor the movie",
            default: true,
          },
          searchForMovie: {
            type: "boolean",
            description:
              "Whether to search for the movie immediately after adding",
            default: true,
          },
          tags: {
            type: "array",
            items: { type: "number" },
            description: "Tag IDs to apply to the movie",
          },
        },
        required: [
          "tmdbId",
          "title",
          "year",
          "qualityProfileId",
          "rootFolderPath",
          "minimumAvailability",
        ],
      },
    },
    {
      name: "radarr_get_movies",
      description: "Get all movies in the Radarr library",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of results to return",
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
          },
        },
      },
    },
    {
      name: "radarr_get_movie",
      description: "Get details of a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Movie ID in Radarr",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "radarr_delete_movie",
      description: "Delete a movie from Radarr",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Movie ID in Radarr",
          },
          deleteFiles: {
            type: "boolean",
            description: "Whether to delete movie files",
            default: false,
          },
          addImportExclusion: {
            type: "boolean",
            description: "Whether to add import exclusion",
            default: false,
          },
        },
        required: ["id"],
      },
    },
    {
      name: "radarr_get_queue",
      description: "Get the download queue",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of results to return",
          },
          skip: {
            type: "number",
            description: "Number of results to skip (for pagination)",
          },
        },
      },
    },
    {
      name: "radarr_get_quality_profiles",
      description: "Get available quality profiles",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "radarr_get_root_folders",
      description: "Get available root folders",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "radarr_refresh_movie",
      description: "Refresh metadata for a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Movie ID in Radarr",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "radarr_search_movie_releases",
      description: "Search for releases of a specific movie",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Movie ID in Radarr",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "radarr_get_system_status",
      description: "Get Radarr system status",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "radarr_get_health",
      description: "Get Radarr health check results",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

export async function handleRadarrTool(
  name: string,
  args: unknown,
  config: RadarrConfig,
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case "radarr_search_movie": {
        const { term, limit, skip } = RadarrSearchSchema.parse(args);
        const results = await radarrClient.searchMovie(
          config,
          term,
          limit,
          skip,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr_add_movie": {
        const parsed = RadarrAddMovieSchema.parse(args);
        const params = {
          ...parsed,
          tags: parsed.tags || undefined,
          monitored: parsed.monitored ?? undefined,
          searchForMovie: parsed.searchForMovie ?? undefined,
        };
        const result = await radarrClient.addMovie(config, params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "radarr_get_movies": {
        const { limit, skip } = RadarrPaginatedSchema.parse(args);
        const results = await radarrClient.getMovies(config, limit, skip);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr_get_movie": {
        const { id } = RadarrMovieIdSchema.parse(args);
        const result = await radarrClient.getMovie(config, id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "radarr_delete_movie": {
        const parsed = RadarrMovieIdSchema.extend({
          deleteFiles: z.boolean().optional().default(false),
          addImportExclusion: z.boolean().optional().default(false),
        }).parse(args);

        await radarrClient.deleteMovie(
          config,
          parsed.id,
          parsed.deleteFiles,
          parsed.addImportExclusion,
        );
        return {
          content: [{
            type: "text",
            text: `Movie ${parsed.id} deleted successfully`,
          }],
        };
      }

      case "radarr_get_queue": {
        const { limit, skip } = RadarrPaginatedSchema.parse(args);
        const results = await radarrClient.getQueue(config, limit, skip);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr_get_quality_profiles": {
        const results = await radarrClient.getQualityProfiles(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr_get_root_folders": {
        const results = await radarrClient.getRootFolders(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr_refresh_movie": {
        const { id } = RadarrMovieIdSchema.parse(args);
        await radarrClient.refreshMovie(config, id);
        return {
          content: [{
            type: "text",
            text: `Movie ${id} refresh initiated successfully`,
          }],
        };
      }

      case "radarr_search_movie_releases": {
        const { id } = RadarrMovieIdSchema.parse(args);
        await radarrClient.searchMovieReleases(config, id);
        return {
          content: [{
            type: "text",
            text: `Search for movie ${id} releases initiated successfully`,
          }],
        };
      }

      case "radarr_get_system_status": {
        const result = await radarrClient.getSystemStatus(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "radarr_get_health": {
        const results = await radarrClient.getHealth(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown Radarr tool: ${name}`);
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
