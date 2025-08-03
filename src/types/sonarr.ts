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
