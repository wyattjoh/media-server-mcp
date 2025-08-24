export interface GetCapabilitiesResponse {
  MediaContainer: PlexCapabilitiesMediaContainer;
}

interface PlexCapabilitiesMediaContainer {
  size: number;
  allowCameraUpload: boolean;
  allowChannelAccess: boolean;
  allowMediaDeletion: boolean;
  allowSharing: boolean;
  allowSync: boolean;
  allowTuners: boolean;
  apiVersion: string;
  backgroundProcessing: boolean;
  certificate: boolean;
  companionProxy: boolean;
  countryCode: string;
  diagnostics: string;
  eventStream: boolean;
  friendlyName: string;
  hubSearch: boolean;
  itemClusters: boolean;
  livetv: number;
  machineIdentifier: string;
  mediaProviders: boolean;
  multiuser: boolean;
  musicAnalysis: number;
  myPlex: boolean;
  myPlexMappingState: string;
  myPlexSigninState: string;
  myPlexSubscription: boolean;
  myPlexUsername: string;
  offlineTranscode: number;
  ownerFeatures: string;
  platform: string;
  platformVersion: string;
  pluginHost: boolean;
  pushNotifications: boolean;
  readOnlyLibraries: boolean;
  streamingBrainABRVersion: number;
  streamingBrainVersion: number;
  sync: boolean;
  transcoderActiveVideoSessions: number;
  transcoderAudio: boolean;
  transcoderLyrics: boolean;
  transcoderPhoto: boolean;
  transcoderSubtitles: boolean;
  transcoderVideo: boolean;
  transcoderVideoBitrates: string;
  transcoderVideoQualities: string;
  transcoderVideoResolutions: string;
  updatedAt: number;
  updater: boolean;
  version: string;
  voiceSearch: boolean;
  Directory: PlexCapabilitiesDirectoryItem[];
}

interface PlexCapabilitiesDirectoryItem {
  count: number;
  key: string;
  title: string;
}

export interface GetLibrariesResponse {
  MediaContainer: GetLibrariesResponseMediaContainer;
}

interface GetLibrariesResponseMediaContainer {
  size: number;
  allowSync: boolean;
  title1: string;
  Directory: GetLibrariesResponseDirectoryItem[];
}

interface GetLibrariesResponseDirectoryItem {
  allowSync: boolean;
  filters: boolean;
  refreshing: boolean;
  key: string;
  type: string;
  title: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  content: boolean;
  directory: boolean;
  contentChangedAt: number;
  hidden: number;
  Location: GetLibrariesResponseLocationItem[];
}

interface GetLibrariesResponseLocationItem {
  id: number;
  path: string;
}

export enum SearchType {
  Movies = "movies",
  TV = "tv",
  OtherVideos = "otherVideos",
  People = "people",
}

export interface SearchResponse {
  MediaContainer: SearchResponseMediaContainer;
}

interface SearchResponseMediaContainer {
  size: number;
  identifier: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  Metadata: MetadataItem[];
  Provider: ProviderItem[];
}

interface BaseMetadataItem {
  ratingKey: string;
  key: string;
  guid: string;
  slug: string;
  studio: string;
  type: string;
  title: string;
  titleSort: string;
  contentRating: string;
  summary: string;
  rating: number;
  audienceRating: number;
  year: number;
  tagline: string;
  thumb: string;
  art: string;
  duration: number;
  originallyAvailableAt: string;
  addedAt: number;
  updatedAt: number;
  audienceRatingImage: string;
  primaryExtraKey: string;
  ratingImage: string;
  Media: MediaItem[];
  Image: ImageItem[];
  UltraBlurColors: UltraBlurColors;
  Genre: GenreItem[];
  Country: CountryItem[];
  Director: DirectorItem[];
  Writer: WriterItem[];
  Role: RoleItem[];
}

interface MetadataItem extends BaseMetadataItem {
  allowSync: boolean;
  librarySectionID: number;
  librarySectionTitle: string;
  librarySectionUUID: string;
  personal: boolean;
  sourceTitle: string;
  viewCount?: number;
  lastViewedAt?: number;
  chapterSource?: string;
  parentRatingKey?: string;
  grandparentRatingKey?: string;
  parentGuid?: string;
  grandparentGuid?: string;
  grandparentSlug?: string;
  grandparentKey?: string;
  parentKey?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  index?: number;
  parentIndex?: number;
  parentThumb?: string;
  grandparentThumb?: string;
  grandparentArt?: string;
  grandparentTheme?: string;
}

interface MediaItem {
  id: number;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  aspectRatio: number;
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
  videoResolution: string;
  container: string;
  videoFrameRate: string;
  optimizedForStreaming?: number;
  has64bitOffsets?: boolean;
  videoProfile: string;
  hasVoiceActivity: boolean;
  Part: DetailedPartItem[];
  audioProfile?: string;
}

interface PartItem {
  id: number;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
  has64bitOffsets?: boolean;
  hasThumbnail?: string;
  indexes: string;
  optimizedForStreaming?: boolean;
  videoProfile: string;
  audioProfile?: string;
}

interface DetailedPartItem extends PartItem {
  Stream: StreamItem[];
}

interface ImageItem {
  alt: string;
  type: string;
  url: string;
}

interface UltraBlurColors {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

interface BaseTagItem {
  tag: string;
}

interface GenreItem extends BaseTagItem {}
interface CountryItem extends BaseTagItem {}
interface DirectorItem extends BaseTagItem {}
interface WriterItem extends BaseTagItem {}
interface RoleItem extends BaseTagItem {}

interface ProviderItem {
  key: string;
  m_title: string;
  m_type: string;
}

export interface GetMetadataResponse {
  MediaContainer: MediaContainer;
}
interface MediaContainer {
  size: number;
  allowSync: boolean;
  identifier: string;
  librarySectionID: number;
  librarySectionTitle: string;
  librarySectionUUID: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  Metadata: DetailedMetadataItem[];
}

interface DetailedMetadataItem extends BaseMetadataItem {
  librarySectionTitle: string;
  librarySectionID: number;
  librarySectionKey: string;
  Guid: GuidItem[];
  Rating: RatingItem[];
  Collection: CollectionItem[];
  Producer: DetailedPersonItem[];
}

interface StreamItem {
  id: number;
  streamType: number;
  "default": boolean;
  codec: string;
  index: number;
  bitrate: number;
  bitDepth?: number;
  chromaLocation?: string;
  chromaSubsampling?: string;
  codedHeight?: number;
  codedWidth?: number;
  colorPrimaries?: string;
  colorRange?: string;
  colorSpace?: string;
  colorTrc?: string;
  frameRate?: number;
  hasScalingMatrix?: boolean;
  height?: number;
  level?: number;
  profile?: string;
  refFrames?: number;
  scanType?: string;
  streamIdentifier: string;
  width?: number;
  displayTitle: string;
  extendedDisplayTitle: string;
  selected?: boolean;
  channels?: number;
  language?: string;
  languageTag?: string;
  languageCode?: string;
  audioChannelLayout?: string;
  samplingRate?: number;
  canAutoSync?: boolean;
}

interface DetailedTagItem extends BaseTagItem {
  id: number;
  filter: string;
}

interface GuidItem {
  id: string;
}

interface RatingItem {
  image: string;
  value: number;
  type: string;
}

interface CollectionItem {
  id: number;
  filter: string;
  tag: string;
  guid: string;
  summary: string;
}

interface DetailedPersonItem extends DetailedTagItem {
  tagKey: string;
  thumb: string;
}
