import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SonarrConfig, SonarrSeries } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";

// Common pagination schema
const PaginationSchema = z.object({
  limit: z.number().optional().describe(
    "Maximum number of results to return",
  ),
  skip: z.number().optional().describe(
    "Number of results to skip (for pagination)",
  ),
});

// Sonarr tool schemas
const SonarrSearchSchema = z.object({
  term: z.string().describe("TV series title to search for"),
}).merge(PaginationSchema);

const SonarrAddSeriesSchema = z.object({
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
  )
    .describe("Type of series"),
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
});

const SonarrSeriesIdSchema = z.object({
  id: z.number().describe("Series ID in Sonarr"),
});

const SonarrEpisodesSchema = z.object({
  seriesId: z.number().describe("Series ID to get episodes for"),
  seasonNumber: z.number().optional().describe(
    "Specific season number (optional)",
  ),
}).merge(PaginationSchema);

const SonarrCalendarSchema = z.object({
  start: z.string().optional().describe("Start date (ISO format, optional)"),
  end: z.string().optional().describe("End date (ISO format, optional)"),
  includeSeries: z.boolean().optional().default(false)
    .describe("Whether to include series information"),
  includeEpisodeFile: z.boolean().optional().default(false)
    .describe("Whether to include episode file information"),
}).merge(PaginationSchema);

const SonarrMonitorEpisodeSchema = z.object({
  episodeIds: z.array(z.number()).describe("Episode IDs to monitor/unmonitor"),
  monitored: z.boolean().describe(
    "Whether to monitor or unmonitor the episodes",
  ),
});

// Sonarr series filter schemas
const SonarrSeriesFiltersSchema = z.object({
  title: z.string().optional(),
  genres: z.array(z.string()).optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  monitored: z.boolean().optional(),
  network: z.string().optional(),
  seriesType: z.string().optional(),
  qualityProfileId: z.number().optional(),
  tags: z.array(z.number()).optional(),
  status: z.string().optional(),
  imdbId: z.string().optional(),
  tmdbId: z.number().optional(),
});

const SonarrSeriesSortSchema = z.object({
  field: z.enum([
    "title",
    "year",
    "added",
    "sizeOnDisk",
    "qualityProfileId",
    "runtime",
    "episodeCount",
  ]),
  direction: z.enum(["asc", "desc"]),
});

export function createSonarrTools(
  server: McpServer,
  config: SonarrConfig,
): void {
  // sonarr_search_series
  server.tool(
    "sonarr_search_series",
    "Search for TV series",
    SonarrSearchSchema.shape,
    async (args) => {
      try {
        const parsed = SonarrSearchSchema.parse(args);
        const results = await sonarrClient.searchSeries(
          config,
          parsed.term,
          parsed.limit,
          parsed.skip,
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

  // sonarr_add_series
  server.tool(
    "sonarr_add_series",
    "Add a TV series to Sonarr",
    SonarrAddSeriesSchema.shape,
    async (args) => {
      try {
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

  // sonarr_delete_series
  server.tool(
    "sonarr_delete_series",
    "Delete a TV series from Sonarr",
    {
      id: { type: "number", description: "Series ID in Sonarr" },
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
    async (args) => {
      try {
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

  // sonarr_update_episode_monitoring
  server.tool(
    "sonarr_update_episode_monitoring",
    "Update episode monitoring status",
    SonarrMonitorEpisodeSchema.shape,
    async (args) => {
      try {
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

  // sonarr_refresh_series
  server.tool(
    "sonarr_refresh_series",
    "Refresh metadata for a specific series",
    SonarrSeriesIdSchema.shape,
    async (args) => {
      try {
        const { id } = SonarrSeriesIdSchema.parse(args);
        await sonarrClient.refreshSeries(config, id);
        return {
          content: [{
            type: "text",
            text: `Series ${id} refresh initiated successfully`,
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

  // sonarr_search_series_episodes
  server.tool(
    "sonarr_search_series_episodes",
    "Search for episodes of a specific series",
    SonarrSeriesIdSchema.shape,
    async (args) => {
      try {
        const { id } = SonarrSeriesIdSchema.parse(args);
        await sonarrClient.searchSeriesEpisodes(config, id);
        return {
          content: [{
            type: "text",
            text: `Search for series ${id} episodes initiated successfully`,
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

  // sonarr_search_season
  server.tool(
    "sonarr_search_season",
    "Search for episodes of a specific season",
    {
      seriesId: { type: "number", description: "Series ID in Sonarr" },
      seasonNumber: { type: "number", description: "Season number to search" },
    },
    async (args) => {
      try {
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

  // sonarr_get_series
  server.tool(
    "sonarr_get_series",
    "Get all TV series in the Sonarr library",
    {
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
            description: "Filter by title (partial match, case-insensitive)",
          },
          genres: {
            type: "array",
            items: { type: "string" },
            description: "Filter by genres (matches any)",
          },
          yearFrom: { type: "number", description: "Filter by minimum year" },
          yearTo: { type: "number", description: "Filter by maximum year" },
          monitored: {
            type: "boolean",
            description: "Filter by monitored status",
          },
          network: {
            type: "string",
            description: "Filter by network (partial match)",
          },
          seriesType: { type: "string", description: "Filter by series type" },
          qualityProfileId: {
            type: "number",
            description: "Filter by quality profile ID",
          },
          tags: {
            type: "array",
            items: { type: "number" },
            description: "Filter by tag IDs (matches any)",
          },
          status: { type: "string", description: "Filter by series status" },
          imdbId: { type: "string", description: "Filter by IMDB ID" },
          tmdbId: { type: "number", description: "Filter by TMDB ID" },
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
    async (args) => {
      try {
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

  // sonarr_get_series_by_id
  server.tool(
    "sonarr_get_series_by_id",
    "Get details of a specific TV series",
    SonarrSeriesIdSchema.shape,
    async (args) => {
      try {
        const { id } = SonarrSeriesIdSchema.parse(args);
        const result = await sonarrClient.getSeriesById(config, id);
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

  // sonarr_get_episodes
  server.tool(
    "sonarr_get_episodes",
    "Get episodes for a specific series",
    SonarrEpisodesSchema.shape,
    async (args) => {
      try {
        const parsed = SonarrEpisodesSchema.parse(args);
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

  // sonarr_get_calendar
  server.tool(
    "sonarr_get_calendar",
    "Get upcoming episodes calendar",
    SonarrCalendarSchema.shape,
    async (args) => {
      try {
        const parsed = SonarrCalendarSchema.parse(args);
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

  // sonarr_get_queue
  server.tool(
    "sonarr_get_queue",
    "Get the download queue",
    PaginationSchema.shape,
    async (args) => {
      try {
        const parsed = PaginationSchema.parse(args);
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

  // sonarr_get_configuration
  server.tool(
    "sonarr_get_configuration",
    "Get Sonarr configuration including quality profiles and root folders",
    {},
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

  // sonarr_get_system_status
  server.tool(
    "sonarr_get_system_status",
    "Get Sonarr system status",
    {},
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

  // sonarr_get_health
  server.tool(
    "sonarr_get_health",
    "Get Sonarr health check results",
    {},
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

  // sonarr_update_series
  server.tool(
    "sonarr_update_series",
    "Update a series' settings in Sonarr",
    {
      id: { type: "number", description: "Series ID in Sonarr" },
      series: {
        type: "object",
        description: "Series object with updated fields",
      },
    },
    async (args) => {
      try {
        const parsed = z.object({
          id: z.number(),
          series: z.object({}).passthrough(),
        }).parse(args);

        const series = { ...parsed.series, id: parsed.id } as SonarrSeries;
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

  // sonarr_get_episode
  server.tool(
    "sonarr_get_episode",
    "Get details of a specific episode by ID",
    { id: { type: "number", description: "Episode ID in Sonarr" } },
    async (args) => {
      try {
        const { id } = z.object({ id: z.number() }).parse(args);
        const result = await sonarrClient.getEpisodeById(config, id);
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

  // sonarr_refresh_all_series
  server.tool(
    "sonarr_refresh_all_series",
    "Refresh metadata for all series in the library",
    {},
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

  // sonarr_search_episodes
  server.tool(
    "sonarr_search_episodes",
    "Search for specific episodes by IDs",
    {
      episodeIds: {
        type: "array",
        items: { type: "number" },
        description: "Array of episode IDs to search for",
      },
    },
    async (args) => {
      try {
        const { episodeIds } = z.object({
          episodeIds: z.array(z.number()),
        }).parse(args);
        await sonarrClient.searchEpisodes(config, episodeIds);
        return {
          content: [{
            type: "text",
            text: `Search initiated for ${episodeIds.length} episodes`,
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

  // sonarr_disk_scan
  server.tool(
    "sonarr_disk_scan",
    "Rescan all series folders for new/missing files",
    {},
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
