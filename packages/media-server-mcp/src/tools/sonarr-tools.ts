import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { MCPToolResult, SonarrConfig } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";
import {
  SonarrAddSeriesSchema,
  SonarrMonitorEpisodeSchema,
  SonarrSearchSchema,
  SonarrSeriesFiltersSchema,
  SonarrSeriesIdSchema,
  SonarrSeriesSortSchema,
} from "@wyattjoh/sonarr";

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
    {
      name: "sonarr_get_series",
      description: "Get all TV series in the Sonarr library",
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
          filters: {
            type: "object",
            description: "Filter options for series",
            properties: {
              title: {
                type: "string",
                description:
                  "Filter by title (partial match, case-insensitive)",
              },
              genres: {
                type: "array",
                items: { type: "string" },
                description: "Filter by genres (matches any)",
              },
              yearFrom: {
                type: "number",
                description: "Filter by minimum year",
              },
              yearTo: {
                type: "number",
                description: "Filter by maximum year",
              },
              monitored: {
                type: "boolean",
                description: "Filter by monitored status",
              },
              network: {
                type: "string",
                description: "Filter by network (partial match)",
              },
              seriesType: {
                type: "string",
                description: "Filter by series type",
              },
              qualityProfileId: {
                type: "number",
                description: "Filter by quality profile ID",
              },
              tags: {
                type: "array",
                items: { type: "number" },
                description: "Filter by tag IDs (matches any)",
              },
              status: {
                type: "string",
                description: "Filter by series status",
              },
              imdbId: {
                type: "string",
                description: "Filter by IMDB ID",
              },
              tmdbId: {
                type: "number",
                description: "Filter by TMDB ID",
              },
            },
          },
          sort: {
            type: "object",
            description: "Sort options for series",
            properties: {
              field: {
                type: "string",
                enum: [
                  "title",
                  "year",
                  "added",
                  "sizeOnDisk",
                  "qualityProfileId",
                  "runtime",
                  "episodeCount",
                ],
                description: "Field to sort by",
              },
              direction: {
                type: "string",
                enum: ["asc", "desc"],
                description: "Sort direction",
              },
            },
            required: ["field", "direction"],
          },
        },
      },
    },
    {
      name: "sonarr_get_series_by_id",
      description: "Get details of a specific TV series",
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
      name: "sonarr_get_episodes",
      description: "Get episodes for a specific series",
      inputSchema: {
        type: "object",
        properties: {
          seriesId: {
            type: "number",
            description: "Series ID to get episodes for",
          },
          seasonNumber: {
            type: "number",
            description: "Specific season number (optional)",
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
        required: ["seriesId"],
      },
    },
    {
      name: "sonarr_get_calendar",
      description: "Get upcoming episodes calendar",
      inputSchema: {
        type: "object",
        properties: {
          start: {
            type: "string",
            description: "Start date (ISO format, optional)",
          },
          end: {
            type: "string",
            description: "End date (ISO format, optional)",
          },
          includeEpisodeFile: {
            type: "boolean",
            description: "Whether to include episode file information",
            default: false,
          },
          includeSeries: {
            type: "boolean",
            description: "Whether to include series information",
            default: false,
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
      },
    },
    {
      name: "sonarr_get_queue",
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
      name: "sonarr_get_configuration",
      description:
        "Get Sonarr configuration including quality profiles and root folders",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "sonarr_get_system_status",
      description: "Get Sonarr system status",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "sonarr_get_health",
      description: "Get Sonarr health check results",
      inputSchema: {
        type: "object",
        properties: {},
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

      case "sonarr_get_series": {
        const parsed = z.object({
          limit: z.number().optional(),
          skip: z.number().optional(),
          filters: SonarrSeriesFiltersSchema.optional(),
          sort: SonarrSeriesSortSchema.optional(),
        }).parse(args);
        const results = await sonarrClient.getSeries(
          config,
          parsed.limit,
          parsed.skip,
          parsed.filters,
          parsed.sort,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr_get_series_by_id": {
        const { id } = SonarrSeriesIdSchema.parse(args);
        const result = await sonarrClient.getSeriesById(config, id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "sonarr_get_episodes": {
        const parsed = z.object({
          seriesId: z.number(),
          seasonNumber: z.number().optional(),
          limit: z.number().optional(),
          skip: z.number().optional(),
        }).parse(args);
        const results = await sonarrClient.getEpisodes(
          config,
          parsed.seriesId,
          parsed.seasonNumber,
          parsed.limit,
          parsed.skip,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr_get_calendar": {
        const parsed = z.object({
          start: z.string().optional(),
          end: z.string().optional(),
          includeEpisodeFile: z.boolean().optional(),
          includeSeries: z.boolean().optional(),
          limit: z.number().optional(),
          skip: z.number().optional(),
        }).parse(args);
        const results = await sonarrClient.getCalendar(
          config,
          parsed.start,
          parsed.end,
          parsed.includeEpisodeFile,
          parsed.includeSeries,
          parsed.limit,
          parsed.skip,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr_get_queue": {
        const parsed = z.object({
          limit: z.number().optional(),
          skip: z.number().optional(),
        }).parse(args);
        const results = await sonarrClient.getQueue(
          config,
          parsed.limit,
          parsed.skip,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case "sonarr_get_configuration": {
        const [qualityProfiles, rootFolders] = await Promise.all([
          sonarrClient.getQualityProfiles(config),
          sonarrClient.getRootFolders(config),
        ]);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                qualityProfiles,
                rootFolders,
              },
              null,
              2,
            ),
          }],
        };
      }

      case "sonarr_get_system_status": {
        const result = await sonarrClient.getSystemStatus(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "sonarr_get_health": {
        const results = await sonarrClient.getHealth(config);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2),
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
