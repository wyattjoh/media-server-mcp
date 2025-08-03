import { z } from 'zod';

// Common MCP tool result interface
export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Configuration interfaces
export interface MediaServerConfig {
  radarr?: {
    url: string;
    apiKey: string;
  };
  sonarr?: {
    url: string;
    apiKey: string;
  };
}

// Zod schemas for tool parameters
export const RadarrSearchSchema = z.object({
  term: z.string().describe('Movie title to search for'),
});

export const RadarrAddMovieSchema = z.object({
  tmdbId: z.number().describe('The Movie Database ID'),
  title: z.string().describe('Movie title'),
  year: z.number().describe('Movie release year'),
  qualityProfileId: z.number().describe('Quality profile ID to use'),
  rootFolderPath: z.string().describe('Root folder path where movie should be stored'),
  minimumAvailability: z.enum(['tba', 'announced', 'inCinemas', 'released', 'preDB'])
    .describe('Minimum availability for monitoring'),
  monitored: z.boolean().optional().default(true).describe('Whether to monitor the movie'),
  searchForMovie: z.boolean().optional().default(true)
    .describe('Whether to search for the movie immediately after adding'),
  tags: z.array(z.number()).optional().describe('Tag IDs to apply to the movie'),
});

export const RadarrMovieIdSchema = z.object({
  id: z.number().describe('Movie ID in Radarr'),
});

export const SonarrSearchSchema = z.object({
  term: z.string().describe('TV series title to search for'),
});

export const SonarrAddSeriesSchema = z.object({
  tvdbId: z.number().describe('The TVDB ID'),
  title: z.string().describe('Series title'),
  qualityProfileId: z.number().describe('Quality profile ID to use'),
  rootFolderPath: z.string().describe('Root folder path where series should be stored'),
  monitored: z.boolean().optional().default(true).describe('Whether to monitor the series'),
  seasonFolder: z.boolean().optional().default(true).describe('Whether to use season folders'),
  seriesType: z.enum(['standard', 'daily', 'anime']).optional().default('standard')
    .describe('Type of series'),
  languageProfileId: z.number().optional().describe('Language profile ID to use'),
  tags: z.array(z.number()).optional().describe('Tag IDs to apply to the series'),
  seasons: z.array(z.object({
    seasonNumber: z.number(),
    monitored: z.boolean(),
  })).optional().describe('Seasons to monitor'),
  searchForMissingEpisodes: z.boolean().optional().default(false)
    .describe('Whether to search for missing episodes after adding'),
});

export const SonarrSeriesIdSchema = z.object({
  id: z.number().describe('Series ID in Sonarr'),
});

export const SonarrEpisodesSchema = z.object({
  seriesId: z.number().describe('Series ID to get episodes for'),
  seasonNumber: z.number().optional().describe('Specific season number (optional)'),
});

export const SonarrCalendarSchema = z.object({
  start: z.string().optional().describe('Start date (ISO format, optional)'),
  end: z.string().optional().describe('End date (ISO format, optional)'),
  includeSeries: z.boolean().optional().default(false)
    .describe('Whether to include series information'),
  includeEpisodeFile: z.boolean().optional().default(false)
    .describe('Whether to include episode file information'),
});

export const SonarrMonitorEpisodeSchema = z.object({
  episodeIds: z.array(z.number()).describe('Episode IDs to monitor/unmonitor'),
  monitored: z.boolean().describe('Whether to monitor or unmonitor the episodes'),
});

// Type exports for tool parameter types
export type RadarrSearchParams = z.infer<typeof RadarrSearchSchema>;
export type RadarrAddMovieParams = z.infer<typeof RadarrAddMovieSchema>;
export type RadarrMovieIdParams = z.infer<typeof RadarrMovieIdSchema>;

export type SonarrSearchParams = z.infer<typeof SonarrSearchSchema>;
export type SonarrAddSeriesParams = z.infer<typeof SonarrAddSeriesSchema>;
export type SonarrSeriesIdParams = z.infer<typeof SonarrSeriesIdSchema>;
export type SonarrEpisodesParams = z.infer<typeof SonarrEpisodesSchema>;
export type SonarrCalendarParams = z.infer<typeof SonarrCalendarSchema>;
export type SonarrMonitorEpisodeParams = z.infer<typeof SonarrMonitorEpisodeSchema>;