import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { SonarrConfig } from "../clients/sonarr.ts";
import * as sonarrClient from "../clients/sonarr.ts";
import type { MCPToolResult } from "../types/mcp.ts";

export function createSonarrResources(): Resource[] {
  return [
    {
      uri: "sonarr://quality-profiles",
      name: "Quality Profiles",
      description: "Available quality profiles in Sonarr",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://root-folders",
      name: "Root Folders",
      description: "Available root folders in Sonarr",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://system/status",
      name: "System Status",
      description: "Sonarr system status information",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://system/health",
      name: "System Health",
      description: "Sonarr health check results",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://series",
      name: "Series Collection",
      description: "All TV series in the Sonarr library",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://queue",
      name: "Download Queue",
      description: "Current download queue status",
      mimeType: "application/json",
    },
    {
      uri: "sonarr://calendar",
      name: "Episode Calendar",
      description: "Upcoming and recent episodes calendar",
      mimeType: "application/json",
    },
  ];
}

export async function handleSonarrResource(
  uri: string,
  config: SonarrConfig,
): Promise<MCPToolResult> {
  try {
    switch (uri) {
      case "sonarr://quality-profiles": {
        const results = await sonarrClient.getQualityProfiles(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr://root-folders": {
        const results = await sonarrClient.getRootFolders(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr://system/status": {
        const result = await sonarrClient.getSystemStatus(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "sonarr://system/health": {
        const results = await sonarrClient.getHealth(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr://series": {
        const results = await sonarrClient.getSeries(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr://queue": {
        const results = await sonarrClient.getQueue(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr://calendar": {
        const results = await sonarrClient.getCalendar(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      default:
        // Handle parameterized URIs
        if (uri.startsWith("sonarr://series/")) {
          const match = uri.match(/^sonarr:\/\/series\/(\d+)$/);
          if (match) {
            const seriesId = parseInt(match[1], 10);
            const result = await sonarrClient.getSeriesById(config, seriesId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
              }],
            };
          }
        }

        if (uri.startsWith("sonarr://series/") && uri.endsWith("/episodes")) {
          const match = uri.match(/^sonarr:\/\/series\/(\d+)\/episodes$/);
          if (match) {
            const seriesId = parseInt(match[1], 10);
            const results = await sonarrClient.getEpisodes(config, seriesId);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(results, null, 2),
              }],
            };
          }
        }
        throw new Error(`Unknown Sonarr resource: ${uri}`);
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
