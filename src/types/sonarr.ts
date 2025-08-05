import { z } from "zod";
import { PaginationSchema } from "./mcp.ts";

// Sonarr tool schemas
export const SonarrSearchSchema = z.object({
  term: z.string().describe("TV series title to search for"),
}).merge(PaginationSchema);

export const SonarrAddSeriesSchema = z.object({
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

export const SonarrSeriesIdSchema = z.object({
  id: z.number().describe("Series ID in Sonarr"),
});

export const SonarrEpisodesSchema = z.object({
  seriesId: z.number().describe("Series ID to get episodes for"),
  seasonNumber: z.number().optional().describe(
    "Specific season number (optional)",
  ),
}).merge(PaginationSchema);

export const SonarrCalendarSchema = z.object({
  start: z.string().optional().describe("Start date (ISO format, optional)"),
  end: z.string().optional().describe("End date (ISO format, optional)"),
  includeSeries: z.boolean().optional().default(false)
    .describe("Whether to include series information"),
  includeEpisodeFile: z.boolean().optional().default(false)
    .describe("Whether to include episode file information"),
}).merge(PaginationSchema);

export const SonarrMonitorEpisodeSchema = z.object({
  episodeIds: z.array(z.number()).describe("Episode IDs to monitor/unmonitor"),
  monitored: z.boolean().describe(
    "Whether to monitor or unmonitor the episodes",
  ),
});

// Sonarr pagination schemas
export const SonarrPaginatedSchema = PaginationSchema;

export const SonarrSeriesPaginatedSchema = PaginationSchema;

export const SonarrQueuePaginatedSchema = PaginationSchema;

export interface SonarrSeries {
  id?: number;
  title: string;
  alternateTitles?: Array<{
    title: string;
    sourceType: string;
    sourceId: number;
    language: {
      id: number;
      name: string;
    };
  }>;
  sortTitle?: string;
  status: string;
  ended: boolean;
  profileName?: string;
  overview?: string;
  nextAiring?: string;
  previousAiring?: string;
  network?: string;
  airTime?: string;
  images?: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  originalLanguage?: {
    id: number;
    name: string;
  };
  remotePoster?: string;
  seasons?: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
      releaseGroups: string[];
      percentOfEpisodes: number;
    };
  }>;
  year: number;
  path: string;
  qualityProfileId: number;
  languageProfileId?: number;
  seasonFolder: boolean;
  monitored: boolean;
  useSceneNumbering: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  titleSlug?: string;
  rootFolderPath?: string;
  folder?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  added?: string;
  seriesType: string;
  cleanTitle?: string;
  ratings?: {
    votes: number;
    value: number;
    type: string;
  };
  statistics?: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    releaseGroups: string[];
    percentOfEpisodes: number;
  };
}

export interface SonarrEpisode {
  id?: number;
  seriesId: number;
  episodeFileId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  airDate?: string;
  airDateUtc?: string;
  runtime?: number;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;
  sceneEpisodeNumber?: number;
  sceneSeasonNumber?: number;
  unverifiedSceneNumbering: boolean;
  ratings?: {
    votes: number;
    value: number;
    type: string;
  };
  images?: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  episodeFile?: {
    id: number;
    seriesId: number;
    seasonNumber: number;
    relativePath: string;
    path: string;
    size: number;
    dateAdded: string;
    sceneName?: string;
    releaseGroup?: string;
    quality: {
      quality: {
        id: number;
        name: string;
        source: string;
        resolution: number;
      };
      revision: {
        version: number;
        real: number;
        isRepack: boolean;
      };
    };
    indexerFlags: number;
    mediaInfo?: {
      containerFormat?: string;
      videoFormat?: string;
      videoCodecID?: string;
      videoCodecLibrary?: string;
      videoBitrate?: number;
      videoBitDepth?: number;
      videoMultiViewCount?: number;
      videoColourPrimaries?: string;
      videoTransferCharacteristics?: string;
      width?: number;
      height?: number;
      audioFormat?: string;
      audioCodecID?: string;
      audioCodecLibrary?: string;
      audioAdditionalFeatures?: string;
      audioBitrate?: number;
      runTime?: string;
      audioStreamCount?: number;
      audioChannels?: number;
      audioChannelPositions?: string;
      audioChannelPositionsText?: string;
      audioProfile?: string;
      videoFps?: number;
      audioLanguages?: string;
      subtitles?: string;
      scanType?: string;
      schemaRevision?: number;
    };
    originalFilePath?: string;
    qualityCutoffNotMet: boolean;
    languages?: Array<{
      id: number;
      name: string;
    }>;
    customFormats?: Array<{
      id: number;
      name: string;
    }>;
  };
  grabbed?: boolean;
}

export interface SonarrQualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    id?: number;
    name?: string;
    quality?: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    items?: Array<{
      quality: {
        id: number;
        name: string;
        source: string;
        resolution: number;
      };
      allowed: boolean;
    }>;
    allowed: boolean;
  }>;
  minFormatScore: number;
  cutoffFormatScore: number;
  formatItems: Array<{
    format: {
      id: number;
      name: string;
      includeCustomFormatWhenRenaming: boolean;
      specifications: Array<{
        name: string;
        implementation: string;
        implementationName: string;
        infoLink?: string;
        negate: boolean;
        required: boolean;
        fields: Array<{
          order: number;
          name: string;
          label: string;
          value: string | number | boolean;
          type: string;
          advanced: boolean;
        }>;
      }>;
    };
    score: number;
  }>;
  language: {
    id: number;
    name: string;
  };
}

export interface SonarrQueueItem {
  seriesId: number;
  episodeId: number;
  languages: Array<{
    id: number;
    name: string;
  }>;
  quality: {
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  };
  customFormats: Array<{
    id: number;
    name: string;
  }>;
  size: number;
  title: string;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  status: string;
  trackedDownloadStatus: string;
  trackedDownloadState: string;
  statusMessages: Array<{
    title: string;
    messages: string[];
  }>;
  errorMessage?: string;
  downloadId: string;
  protocol: string;
  downloadClient: string;
  indexer: string;
  outputPath?: string;
  episode: {
    id: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
    airDate?: string;
    airDateUtc?: string;
    runtime?: number;
    overview?: string;
    seriesId: number;
    monitored: boolean;
    absoluteEpisodeNumber?: number;
    sceneAbsoluteEpisodeNumber?: number;
    sceneEpisodeNumber?: number;
    sceneSeasonNumber?: number;
    hasFile: boolean;
    unverifiedSceneNumbering: boolean;
  };
  series: {
    id: number;
    title: string;
    sortTitle?: string;
    status: string;
    ended: boolean;
    overview?: string;
    network?: string;
    airTime?: string;
    images?: Array<{
      coverType: string;
      url: string;
      remoteUrl?: string;
    }>;
    year: number;
    path: string;
    qualityProfileId: number;
    languageProfileId?: number;
    seasonFolder: boolean;
    monitored: boolean;
    useSceneNumbering: boolean;
    runtime: number;
    tvdbId: number;
    tvRageId?: number;
    tvMazeId?: number;
    imdbId?: string;
    titleSlug?: string;
    certification?: string;
    genres?: string[];
    tags?: number[];
    added?: string;
    seriesType: string;
    cleanTitle?: string;
  };
  id: number;
}

export interface SonarrSearchResult {
  title: string;
  sortTitle?: string;
  status: string;
  ended: boolean;
  overview?: string;
  network?: string;
  airTime?: string;
  images?: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  remotePoster?: string;
  seasons?: Array<{
    seasonNumber: number;
    monitored: boolean;
  }>;
  year: number;
  qualityProfileId?: number;
  languageProfileId?: number;
  seasonFolder?: boolean;
  monitored?: boolean;
  useSceneNumbering?: boolean;
  runtime: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  titleSlug?: string;
  folder?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  seriesType: string;
  cleanTitle?: string;
  ratings?: {
    votes: number;
    value: number;
    type: string;
  };
  statistics?: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    releaseGroups: string[];
    percentOfEpisodes: number;
  };
}

export interface SonarrCalendarItem {
  seriesId: number;
  episodeFileId?: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  airDate?: string;
  airDateUtc?: string;
  runtime?: number;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;
  sceneEpisodeNumber?: number;
  sceneSeasonNumber?: number;
  unverifiedSceneNumbering: boolean;
  series?: SonarrSeries;
  id: number;
}

export interface SonarrSystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isNetCore: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  mode: string;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  migrationVersion: number;
  urlBase?: string;
  runtimeVersion: string;
  runtimeName: string;
  startTime: string;
  packageVersion: string;
  packageAuthor: string;
  packageUpdateMechanism: string;
}

export interface SonarrHealth {
  source: string;
  type: string;
  message: string;
  wikiUrl?: string;
}

export interface SonarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{
    name: string;
    path: string;
  }>;
}

export interface SonarrQueueResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: SonarrQueueItem[];
}

export interface SonarrAddSeriesOptions {
  title: string;
  qualityProfileId: number;
  languageProfileId: number | undefined;
  monitored: boolean | undefined;
  tvdbId: number;
  rootFolderPath: string;
  seasonFolder: boolean | undefined;
  seriesType: "standard" | "daily" | "anime" | undefined;
  tags: number[] | undefined;
  seasons:
    | Array<{
      seasonNumber: number;
      monitored: boolean;
    }>
    | undefined;
  addOptions: {
    ignoreEpisodesWithFiles: boolean | undefined;
    ignoreEpisodesWithoutFiles: boolean | undefined;
    searchForMissingEpisodes: boolean | undefined;
  } | undefined;
}
