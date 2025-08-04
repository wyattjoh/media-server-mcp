import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { SonarrConfig } from "../clients/sonarr.ts";
import * as sonarrClient from "../clients/sonarr.ts";
import type { MCPToolResult } from "../types/mcp.ts";
import {
  SonarrAddSeriesSchema,
  SonarrMonitorEpisodeSchema,
  SonarrSearchSchema,
  SonarrSeriesIdSchema,
} from "../types/mcp.ts";

export function createSonarrTools(): Tool[] {
  return [
    {
      name: "sonarr_search_series",
      description: "Search for TV series",
      inputSchema: {
        type: "object",
        properties: {
          term: {
            type: "string",
            description: "TV series title to search for",
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
      name: "sonarr_add_series",
      description: "Add a TV series to Sonarr",
      inputSchema: {
        type: "object",
        properties: {
          tvdbId: {
            type: "number",
            description: "The TVDB ID",
          },
          title: {
            type: "string",
            description: "Series title",
          },
          qualityProfileId: {
            type: "number",
            description: "Quality profile ID to use",
          },
          rootFolderPath: {
            type: "string",
            description: "Root folder path where series should be stored",
          },
          monitored: {
            type: "boolean",
            description: "Whether to monitor the series",
            default: true,
          },
          seasonFolder: {
            type: "boolean",
            description: "Whether to use season folders",
            default: true,
          },
          seriesType: {
            type: "string",
            enum: ["standard", "daily", "anime"],
            description: "Type of series",
            default: "standard",
          },
          languageProfileId: {
            type: "number",
            description: "Language profile ID to use",
          },
          tags: {
            type: "array",
            items: { type: "number" },
            description: "Tag IDs to apply to the series",
          },
          seasons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                seasonNumber: { type: "number" },
                monitored: { type: "boolean" },
              },
              required: ["seasonNumber", "monitored"],
            },
            description: "Seasons to monitor",
          },
          searchForMissingEpisodes: {
            type: "boolean",
            description: "Whether to search for missing episodes after adding",
            default: false,
          },
        },
        required: ["tvdbId", "title", "qualityProfileId", "rootFolderPath"],
      },
    },
    {
      name: "sonarr_delete_series",
      description: "Delete a TV series from Sonarr",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Series ID in Sonarr",
          },
          deleteFiles: {
            type: "boolean",
            description: "Whether to delete series files",
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
      name: "sonarr_update_episode_monitoring",
      description: "Update episode monitoring status",
      inputSchema: {
        type: "object",
        properties: {
          episodeIds: {
            type: "array",
            items: { type: "number" },
            description: "Episode IDs to monitor/unmonitor",
          },
          monitored: {
            type: "boolean",
            description: "Whether to monitor or unmonitor the episodes",
          },
        },
        required: ["episodeIds", "monitored"],
      },
    },
    {
      name: "sonarr_refresh_series",
      description: "Refresh metadata for a specific series",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Series ID in Sonarr",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "sonarr_search_series_episodes",
      description: "Search for episodes of a specific series",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Series ID in Sonarr",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "sonarr_search_season",
      description: "Search for episodes of a specific season",
      inputSchema: {
        type: "object",
        properties: {
          seriesId: {
            type: "number",
            description: "Series ID in Sonarr",
          },
          seasonNumber: {
            type: "number",
            description: "Season number to search",
          },
        },
        required: ["seriesId", "seasonNumber"],
      },
    },
  ];
}

export async function handleSonarrTool(
  name: string,
  args: unknown,
  config: SonarrConfig,
): Promise<MCPToolResult> {
  try {
    switch (name) {
      case "sonarr_search_series": {
        const { term, limit, skip } = SonarrSearchSchema.parse(args);
        const results = await sonarrClient.searchSeries(
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

      case "sonarr_add_series": {
        const parsed = SonarrAddSeriesSchema.parse(args);
        const params = {
          ...parsed,
          languageProfileId: parsed.languageProfileId || undefined,
          monitored: parsed.monitored ?? undefined,
          seasonFolder: parsed.seasonFolder ?? undefined,
          seriesType: parsed.seriesType || undefined,
          tags: parsed.tags || undefined,
          seasons: parsed.seasons || undefined,
          addOptions: parsed.searchForMissingEpisodes !== undefined
            ? {
              searchForMissingEpisodes: parsed.searchForMissingEpisodes,
              ignoreEpisodesWithFiles: undefined,
              ignoreEpisodesWithoutFiles: undefined,
            }
            : undefined,
        };
        const result = await sonarrClient.addSeries(config, params);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "sonarr_delete_series": {
        const parsed = SonarrSeriesIdSchema.extend({
          deleteFiles: z.boolean().optional().default(false),
          addImportExclusion: z.boolean().optional().default(false),
        }).parse(args);

        await sonarrClient.deleteSeries(
          config,
          parsed.id,
          parsed.deleteFiles,
          parsed.addImportExclusion,
        );
        return {
          content: [{
            type: "text",
            text: `Series ${parsed.id} deleted successfully`,
          }],
        };
      }

      case "sonarr_update_episode_monitoring": {
        const { episodeIds, monitored } = SonarrMonitorEpisodeSchema.parse(
          args,
        );
        await sonarrClient.updateEpisodeMonitoring(
          config,
          episodeIds,
          monitored,
        );
        return {
          content: [{
            type: "text",
            text:
              `Episode monitoring updated for ${episodeIds.length} episodes`,
          }],
        };
      }

      case "sonarr_refresh_series": {
        const { id } = SonarrSeriesIdSchema.parse(args);
        await sonarrClient.refreshSeries(config, id);
        return {
          content: [{
            type: "text",
            text: `Series ${id} refresh initiated successfully`,
          }],
        };
      }

      case "sonarr_search_series_episodes": {
        const { id } = SonarrSeriesIdSchema.parse(args);
        await sonarrClient.searchSeriesEpisodes(config, id);
        return {
          content: [{
            type: "text",
            text: `Search for series ${id} episodes initiated successfully`,
          }],
        };
      }

      case "sonarr_search_season": {
        const parsed = z.object({
          seriesId: z.number(),
          seasonNumber: z.number(),
        }).parse(args);

        await sonarrClient.searchSeason(
          config,
          parsed.seriesId,
          parsed.seasonNumber,
        );
        return {
          content: [{
            type: "text",
            text:
              `Search for series ${parsed.seriesId} season ${parsed.seasonNumber} initiated successfully`,
          }],
        };
      }

      default:
        throw new Error(`Unknown Sonarr tool: ${name}`);
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
