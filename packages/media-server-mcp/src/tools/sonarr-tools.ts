import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SonarrConfig, SonarrSeries } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";

export function createSonarrTools(
  server: McpServer,
  config: Readonly<SonarrConfig>,
  isToolEnabled: (toolName: string) => boolean,
): void {
  // sonarr_search_series
  if (isToolEnabled("sonarr_search_series")) {
    server.registerTool(
      "sonarr_search_series",
      {
        title: "Search for TV series",
        description: "Search for TV series",
        inputSchema: {
          term: z.string().describe("TV series title to search for"),
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
        },
      },
      async (args) => {
        try {
          const results = await sonarrClient.searchSeries(
            config,
            args.term,
            args.limit,
            args.skip,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_add_series
  if (isToolEnabled("sonarr_add_series")) {
    server.registerTool(
      "sonarr_add_series",
      {
        title: "Add a TV series to Sonarr",
        description: "Add a TV series to Sonarr",
        inputSchema: {
          tvdbId: z.number().describe("The TVDB ID"),
          title: z.string().describe("Series title"),
          qualityProfileId: z.number().describe("Quality profile ID to use"),
          rootFolderPath: z.string().describe(
            "Root folder path where series should be stored",
          ),
          monitored: z.boolean().optional().default(true).describe(
            "Whether to monitor the series",
          ),
          seasonFolder: z.boolean().optional().default(true).describe(
            "Whether to use season folders",
          ),
          seriesType: z.enum(["standard", "daily", "anime"]).optional().default(
            "standard",
          ).describe("Type of series"),
          languageProfileId: z.number().optional().describe(
            "Language profile ID to use",
          ),
          tags: z.array(z.number()).optional().describe(
            "Tag IDs to apply to the series",
          ),
          seasons: z.array(z.object({
            seasonNumber: z.number(),
            monitored: z.boolean(),
          })).optional().describe("Seasons to monitor"),
          searchForMissingEpisodes: z.boolean().optional().default(false)
            .describe("Whether to search for missing episodes after adding"),
        },
      },
      async (args) => {
        try {
          const params = {
            ...args,
            languageProfileId: args.languageProfileId || undefined,
            monitored: args.monitored ?? undefined,
            seasonFolder: args.seasonFolder ?? undefined,
            seriesType: args.seriesType || undefined,
            tags: args.tags || undefined,
            seasons: args.seasons || undefined,
            addOptions: args.searchForMissingEpisodes !== undefined
              ? {
                searchForMissingEpisodes: args.searchForMissingEpisodes,
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
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_delete_series
  if (isToolEnabled("sonarr_delete_series")) {
    server.registerTool(
      "sonarr_delete_series",
      {
        title: "Delete a TV series from Sonarr",
        description: "Delete a TV series from Sonarr",
        inputSchema: {
          id: z.number().describe("Series ID in Sonarr"),
          deleteFiles: z.boolean().optional().default(false).describe(
            "Whether to delete series files",
          ),
          addImportExclusion: z.boolean().optional().default(false).describe(
            "Whether to add import exclusion",
          ),
        },
      },
      async (args) => {
        try {
          await sonarrClient.deleteSeries(
            config,
            args.id,
            args.deleteFiles,
            args.addImportExclusion,
          );
          return {
            content: [{
              type: "text",
              text: `Series ${args.id} deleted successfully`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_update_episode_monitoring
  if (isToolEnabled("sonarr_update_episode_monitoring")) {
    server.registerTool(
      "sonarr_update_episode_monitoring",
      {
        title: "Update episode monitoring status",
        description: "Update episode monitoring status",
        inputSchema: {
          episodeIds: z.array(z.number()).describe(
            "Episode IDs to monitor/unmonitor",
          ),
          monitored: z.boolean().describe(
            "Whether to monitor or unmonitor the episodes",
          ),
        },
      },
      async (args) => {
        try {
          await sonarrClient.updateEpisodeMonitoring(
            config,
            args.episodeIds,
            args.monitored,
          );
          return {
            content: [{
              type: "text",
              text:
                `Episode monitoring updated for ${args.episodeIds.length} episodes`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_refresh_series
  if (isToolEnabled("sonarr_refresh_series")) {
    server.registerTool(
      "sonarr_refresh_series",
      {
        title: "Refresh metadata for a specific series",
        description: "Refresh metadata for a specific series",
        inputSchema: {
          id: z.number().describe("Series ID in Sonarr"),
        },
      },
      async (args) => {
        try {
          await sonarrClient.refreshSeries(config, args.id);
          return {
            content: [{
              type: "text",
              text: `Series ${args.id} refresh initiated successfully`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_search_series_episodes
  if (isToolEnabled("sonarr_search_series_episodes")) {
    server.registerTool(
      "sonarr_search_series_episodes",
      {
        title: "Search for episodes of a specific series",
        description: "Search for episodes of a specific series",
        inputSchema: {
          id: z.number().describe("Series ID in Sonarr"),
        },
      },
      async (args) => {
        try {
          await sonarrClient.searchSeriesEpisodes(config, args.id);
          return {
            content: [{
              type: "text",
              text:
                `Search for series ${args.id} episodes initiated successfully`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_search_season
  if (isToolEnabled("sonarr_search_season")) {
    server.registerTool(
      "sonarr_search_season",
      {
        title: "Search for episodes of a specific season",
        description: "Search for episodes of a specific season",
        inputSchema: {
          seriesId: z.number().describe("Series ID in Sonarr"),
          seasonNumber: z.number().describe("Season number to search"),
        },
      },
      async (args) => {
        try {
          await sonarrClient.searchSeason(
            config,
            args.seriesId,
            args.seasonNumber,
          );
          return {
            content: [{
              type: "text",
              text:
                `Search for series ${args.seriesId} season ${args.seasonNumber} initiated successfully`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_series
  if (isToolEnabled("sonarr_get_series")) {
    server.registerTool(
      "sonarr_get_series",
      {
        title: "Get all TV series in the Sonarr library",
        description: "Get all TV series in the Sonarr library",
        inputSchema: {
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
          filters: z.object({
            title: z.string().optional().describe(
              "Filter by title (partial match, case-insensitive)",
            ),
            genres: z.array(z.string()).optional().describe(
              "Filter by genres (matches any)",
            ),
            yearFrom: z.number().optional().describe("Filter by minimum year"),
            yearTo: z.number().optional().describe("Filter by maximum year"),
            monitored: z.boolean().optional().describe(
              "Filter by monitored status",
            ),
            network: z.string().optional().describe(
              "Filter by network (partial match)",
            ),
            seriesType: z.string().optional().describe("Filter by series type"),
            qualityProfileId: z.number().optional().describe(
              "Filter by quality profile ID",
            ),
            tags: z.array(z.number()).optional().describe(
              "Filter by tag IDs (matches any)",
            ),
            status: z.string().optional().describe("Filter by series status"),
            imdbId: z.string().optional().describe("Filter by IMDB ID"),
            tmdbId: z.number().optional().describe("Filter by TMDB ID"),
          }).optional().describe("Filter options for series"),
          sort: z.object({
            field: z.enum([
              "title",
              "year",
              "added",
              "sizeOnDisk",
              "qualityProfileId",
              "runtime",
              "episodeCount",
            ]).describe("Field to sort by"),
            direction: z.enum(["asc", "desc"]).describe("Sort direction"),
          }).optional().describe("Sort options for series"),
        },
      },
      async (args) => {
        try {
          const results = await sonarrClient.getSeries(
            config,
            args.limit,
            args.skip,
            args.filters,
            args.sort,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_series_by_id
  if (isToolEnabled("sonarr_get_series_by_id")) {
    server.registerTool(
      "sonarr_get_series_by_id",
      {
        title: "Get details of a specific TV series",
        description: "Get details of a specific TV series",
        inputSchema: {
          id: z.number().describe("Series ID in Sonarr"),
        },
      },
      async (args) => {
        try {
          const result = await sonarrClient.getSeriesById(config, args.id);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_episodes
  if (isToolEnabled("sonarr_get_episodes")) {
    server.registerTool(
      "sonarr_get_episodes",
      {
        title: "Get episodes for a specific series",
        description: "Get episodes for a specific series",
        inputSchema: {
          seriesId: z.number().describe("Series ID to get episodes for"),
          seasonNumber: z.number().optional().describe(
            "Specific season number (optional)",
          ),
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
        },
      },
      async (args) => {
        try {
          const results = await sonarrClient.getEpisodes(
            config,
            args.seriesId,
            args.seasonNumber,
            args.limit,
            args.skip,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_calendar
  if (isToolEnabled("sonarr_get_calendar")) {
    server.registerTool(
      "sonarr_get_calendar",
      {
        title: "Get upcoming episodes calendar",
        description: "Get upcoming episodes calendar",
        inputSchema: {
          start: z.string().optional().describe(
            "Start date (ISO format, optional)",
          ),
          end: z.string().optional().describe(
            "End date (ISO format, optional)",
          ),
          includeSeries: z.boolean().optional().default(false).describe(
            "Whether to include series information",
          ),
          includeEpisodeFile: z.boolean().optional().default(false).describe(
            "Whether to include episode file information",
          ),
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
        },
      },
      async (args) => {
        try {
          const results = await sonarrClient.getCalendar(
            config,
            args.start,
            args.end,
            args.includeEpisodeFile,
            args.includeSeries,
            args.limit,
            args.skip,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_queue
  if (isToolEnabled("sonarr_get_queue")) {
    server.registerTool(
      "sonarr_get_queue",
      {
        title: "Get the download queue",
        description: "Get the download queue",
        inputSchema: {
          limit: z.number().optional().describe(
            "Maximum number of results to return",
          ),
          skip: z.number().optional().describe(
            "Number of results to skip (for pagination)",
          ),
        },
      },
      async (args) => {
        try {
          const results = await sonarrClient.getQueue(
            config,
            args.limit,
            args.skip,
          );
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_configuration
  if (isToolEnabled("sonarr_get_configuration")) {
    server.registerTool(
      "sonarr_get_configuration",
      {
        title:
          "Get Sonarr configuration including quality profiles and root folders",
        description:
          "Get Sonarr configuration including quality profiles and root folders",
        inputSchema: {},
      },
      async () => {
        try {
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
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_system_status
  if (isToolEnabled("sonarr_get_system_status")) {
    server.registerTool(
      "sonarr_get_system_status",
      {
        title: "Get Sonarr system status",
        description: "Get Sonarr system status",
        inputSchema: {},
      },
      async () => {
        try {
          const result = await sonarrClient.getSystemStatus(config);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_health
  if (isToolEnabled("sonarr_get_health")) {
    server.registerTool(
      "sonarr_get_health",
      {
        title: "Get Sonarr health check results",
        description: "Get Sonarr health check results",
        inputSchema: {},
      },
      async () => {
        try {
          const results = await sonarrClient.getHealth(config);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_update_series
  if (isToolEnabled("sonarr_update_series")) {
    server.registerTool(
      "sonarr_update_series",
      {
        title: "Update a series' settings in Sonarr",
        description: "Update a series' settings in Sonarr",
        inputSchema: {
          id: z.number().describe("Series ID in Sonarr"),
          series: z.object({}).passthrough().describe(
            "Series object with updated fields",
          ),
        },
      },
      async (args) => {
        try {
          const series = { ...args.series, id: args.id } as SonarrSeries;
          const result = await sonarrClient.updateSeries(config, series);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_get_episode
  if (isToolEnabled("sonarr_get_episode")) {
    server.registerTool(
      "sonarr_get_episode",
      {
        title: "Get details of a specific episode by ID",
        description: "Get details of a specific episode by ID",
        inputSchema: {
          id: z.number().describe("Episode ID in Sonarr"),
        },
      },
      async (args) => {
        try {
          const result = await sonarrClient.getEpisodeById(config, args.id);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(result, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_refresh_all_series
  if (isToolEnabled("sonarr_refresh_all_series")) {
    server.registerTool(
      "sonarr_refresh_all_series",
      {
        title: "Refresh metadata for all series in the library",
        description: "Refresh metadata for all series in the library",
        inputSchema: {},
      },
      async () => {
        try {
          await sonarrClient.refreshAllSeries(config);
          return {
            content: [{
              type: "text",
              text: "Refresh initiated for all series in the library",
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_search_episodes
  if (isToolEnabled("sonarr_search_episodes")) {
    server.registerTool(
      "sonarr_search_episodes",
      {
        title: "Search for specific episodes by IDs",
        description: "Search for specific episodes by IDs",
        inputSchema: {
          episodeIds: z.array(z.number()).describe(
            "Array of episode IDs to search for",
          ),
        },
      },
      async (args) => {
        try {
          await sonarrClient.searchEpisodes(config, args.episodeIds);
          return {
            content: [{
              type: "text",
              text: `Search initiated for ${args.episodeIds.length} episodes`,
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }

  // sonarr_disk_scan
  if (isToolEnabled("sonarr_disk_scan")) {
    server.registerTool(
      "sonarr_disk_scan",
      {
        title: "Rescan all series folders for new/missing files",
        description: "Rescan all series folders for new/missing files",
        inputSchema: {},
      },
      async () => {
        try {
          await sonarrClient.diskScan(config);
          return {
            content: [{
              type: "text",
              text: "Disk scan initiated for all series folders",
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            }],
          };
        }
      },
    );
  }
}
