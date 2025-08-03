export interface RadarrMovie {
  id?: number;
  title: string;
  originalTitle?: string;
  alternateTitles?: Array<{
    sourceType: string;
    movieId: number;
    title: string;
    sourceId: number;
    votes: number;
    voteCount: number;
    language: {
      id: number;
      name: string;
    };
  }>;
  secondaryYearSourceId?: number;
  sortTitle?: string;
  sizeOnDisk?: number;
  status: string;
  overview?: string;
  inCinemas?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  images?: Array<{
    coverType: string;
    url: string;
    remoteUrl: string;
  }>;
  website?: string;
  year: number;
  hasFile: boolean;
  youTubeTrailerId?: string;
  studio?: string;
  path: string;
  qualityProfileId: number;
  monitored: boolean;
  minimumAvailability: string;
  isAvailable: boolean;
  folderName?: string;
  runtime: number;
  cleanTitle?: string;
  imdbId?: string;
  tmdbId: number;
  titleSlug?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  added?: string;
  ratings?: {
    votes: number;
    value: number;
    type: string;
  };
  movieFile?: {
    id: number;
    movieId: number;
    relativePath: string;
    path: string;
    size: number;
    dateAdded: string;
    sceneName?: string;
    indexerFlags: number;
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
    releaseGroup?: string;
    edition?: string;
    languages?: Array<{
      id: number;
      name: string;
    }>;
    customFormats?: Array<{
      id: number;
      name: string;
    }>;
  };
  collection?: {
    name: string;
    tmdbId: number;
    images: Array<{
      coverType: string;
      url: string;
      remoteUrl?: string;
    }>;
  };
}

export interface RadarrQualityProfile {
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

export interface RadarrQueueItem {
  movieId: number;
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
  id: number;
}

export interface RadarrSearchResult {
  title: string;
  originalTitle?: string;
  alternateTitles?: Array<{
    sourceType: string;
    movieId: number;
    title: string;
    sourceId: number;
    votes: number;
    voteCount: number;
    language: {
      id: number;
      name: string;
    };
  }>;
  secondaryYearSourceId?: number;
  sortTitle?: string;
  sizeOnDisk?: number;
  status: string;
  overview?: string;
  inCinemas?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  images?: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  website?: string;
  year: number;
  hasFile: boolean;
  youTubeTrailerId?: string;
  studio?: string;
  path?: string;
  qualityProfileId?: number;
  monitored?: boolean;
  minimumAvailability?: string;
  isAvailable: boolean;
  folderName?: string;
  runtime: number;
  cleanTitle?: string;
  imdbId?: string;
  tmdbId: number;
  titleSlug?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
  added?: string;
  ratings?: {
    votes: number;
    value: number;
    type: string;
  };
  remotePoster?: string;
  folder?: string;
}

export interface RadarrSystemStatus {
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

export interface RadarrHealth {
  source: string;
  type: string;
  message: string;
  wikiUrl?: string;
}

export interface RadarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{
    name: string;
    path: string;
  }>;
}

export interface RadarrAddMovieOptions {
  title: string;
  qualityProfileId: number;
  minimumAvailability: "tba" | "announced" | "inCinemas" | "released" | "preDB";
  monitored: boolean | undefined;
  tmdbId: number;
  year: number;
  rootFolderPath: string;
  tags: number[] | undefined;
  searchForMovie: boolean | undefined;
}
