import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { RadarrConfig } from "../clients/radarr.ts";
import * as radarrClient from "../clients/radarr.ts";
import type { MCPToolResult } from "../types/mcp.ts";

export function createRadarrResources(): Resource[] {
  return [
    {
      uri: "radarr://quality-profiles",
      name: "Quality Profiles",
      description: "Available quality profiles in Radarr",
      mimeType: "application/json",
    },
    {
      uri: "radarr://root-folders",
      name: "Root Folders",
      description: "Available root folders in Radarr",
      mimeType: "application/json",
    },
    {
      uri: "radarr://system/status",
      name: "System Status",
      description: "Radarr system status information",
      mimeType: "application/json",
    },
    {
      uri: "radarr://system/health",
      name: "System Health",
      description: "Radarr health check results",
      mimeType: "application/json",
    },
    {
      uri: "radarr://movies",
      name: "Movies Collection",
      description: "All movies in the Radarr library",
      mimeType: "application/json",
    },
    {
      uri: "radarr://queue",
      name: "Download Queue",
      description: "Current download queue status",
      mimeType: "application/json",
    },
  ];
}

export async function handleRadarrResource(
  uri: string,
  config: RadarrConfig,
): Promise<MCPToolResult> {
  try {
    switch (uri) {
      case "radarr://quality-profiles": {
        const results = await radarrClient.getQualityProfiles(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr://root-folders": {
        const results = await radarrClient.getRootFolders(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr://system/status": {
        const result = await radarrClient.getSystemStatus(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "radarr://system/health": {
        const results = await radarrClient.getHealth(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr://movies": {
        const results = await radarrClient.getMovies(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "radarr://queue": {
        const results = await radarrClient.getQueue(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      default:
        // Handle parameterized URIs
        if (uri.startsWith("radarr://movies/")) {
          const match = uri.match(/^radarr:\/\/movies\/(\d+)$/);
          if (match) {
            const movieId = parseInt(match[1], 10);
            const result = await radarrClient.getMovie(config, movieId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
              }],
            };
          }
        }
        throw new Error(`Unknown Radarr resource: ${uri}`);
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
