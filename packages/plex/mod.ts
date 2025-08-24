export {
  createPlexConfig,
  getCapabilities,
  getLibraries,
  getMetadata,
  type PlexConfig,
  refreshLibrary,
  search,
  testConnection,
} from "./src/client.ts";
export { SearchType } from "./src/types.ts";
export type {
  GetCapabilitiesResponse,
  GetLibrariesResponse,
  GetMetadataResponse,
  SearchResponse,
} from "./src/types.ts";
