import { getLogger } from "@logtape/logtape";
import {
  CollectionMetadataItem,
  CreateCollectionResponse,
  GetAccountsResponse,
  GetCapabilitiesResponse,
  GetCollectionItemsResponse,
  GetCollectionsResponse,
  GetLibrariesResponse,
  GetLibraryItemsResponse,
  GetMetadataResponse,
  GetPlaybackHistoryResponse,
  LibraryItemsOptions,
  PlaybackHistoryOptions,
  SearchResponse,
  SearchType,
} from "./types.ts";

const REQUEST_TIMEOUT_MS = 30_000;

type SearchHub = SearchResponse["MediaContainer"]["Hub"][number];
type SearchMetadataItem = NonNullable<SearchHub["Metadata"]>[number];

const PLEX_SEARCH_TYPE_MATCHERS = {
  [SearchType.Movies]: (item) =>
    item.type === "movie" && item.subtype !== "clip",
  [SearchType.TV]: (item) =>
    item.type === "show" || item.type === "season" || item.type === "episode",
  [SearchType.OtherVideos]: (item) =>
    item.type === "clip" || item.subtype === "clip",
  [SearchType.People]: (item) => item.type === "person",
} satisfies Readonly<
  Record<SearchType, (item: SearchMetadataItem) => boolean>
>;

export interface PlexConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createPlexConfig(baseUrl: string, apiKey: string): PlexConfig {
  return {
    baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    apiKey,
  };
}

async function makeRequest<T>(
  config: PlexConfig,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const logger = getLogger(["plex", "http"]);
  const url = `${config.baseUrl}${endpoint}`;

  const headers = {
    "Accept": "application/json",
    "X-Plex-Token": config.apiKey,
    ...options.headers,
  };

  logger.debug("Making API request to {endpoint}", {
    endpoint,
    method: options.method || "GET",
    url,
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.error("API request failed: {status} {statusText}", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method: options.method || "GET",
        url,
      });

      // Consume the body to avoid ReadableStream leaks before throwing
      await response.body?.cancel();

      throw new Error(
        `Plex API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");

    logger.debug("API request successful", {
      endpoint,
      status: response.status,
      contentType,
    });

    // Handle empty responses (like 204 No Content or DELETE with no body).
    // Cancel any potential body to avoid ReadableStream leaks.
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || (!contentLength && !contentType)) {
      await response.body?.cancel();
      return {} as T;
    }

    // Plex returns XML for some endpoints (e.g. metadata PUT). Fall back to
    // discarding the body if JSON parsing fails rather than leaking the stream.
    if (!contentType?.includes("json")) {
      await response.body?.cancel();
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    logger.error("API request failed with exception", {
      error: error instanceof Error ? error.message : String(error),
      endpoint,
      method: options.method || "GET",
      url,
    });

    throw new Error(
      `Plex API request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function getCapabilities(
  config: PlexConfig,
): Promise<GetCapabilitiesResponse> {
  return makeRequest(config, "/");
}

export function getLibraries(
  config: PlexConfig,
): Promise<GetLibrariesResponse> {
  return makeRequest(config, "/library/sections");
}

/**
 * Get Plex system accounts for resolving playback-history account IDs.
 *
 * @param config Plex server configuration.
 * @returns The accounts known to the Plex Media Server.
 */
export function getAccounts(
  config: PlexConfig,
): Promise<GetAccountsResponse> {
  return makeRequest(config, "/accounts");
}

/**
 * Searches Plex libraries and optionally filters results by public media categories.
 *
 * @param config - Plex server connection configuration.
 * @param query - Search query sent to the local Plex hub-search endpoint.
 * @param limit - Maximum results requested from each upstream search hub.
 * @param searchTypes - Media categories retained in the returned hubs.
 * @returns The upstream response, filtered with consistent counts when categories are selected.
 */
export async function search(
  config: PlexConfig,
  query: string,
  limit: number = 100,
  searchTypes: readonly SearchType[] = [],
): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("query", query);
  searchParams.set("limit", limit.toString());

  const response = await makeRequest<SearchResponse>(
    config,
    `/hubs/search?${searchParams.toString()}`,
  );
  if (searchTypes.length === 0) return response;

  const matchers = searchTypes.map((searchType) =>
    PLEX_SEARCH_TYPE_MATCHERS[searchType]
  );
  const hubs = (response.MediaContainer.Hub ?? []).reduce<SearchHub[]>(
    (filteredHubs, hub) => {
      const metadata = hub.Metadata?.filter((item) =>
        matchers.some((matches) => matches(item))
      );
      if (!metadata || metadata.length === 0) return filteredHubs;
      filteredHubs.push({ ...hub, size: metadata.length, Metadata: metadata });
      return filteredHubs;
    },
    [],
  );

  return {
    ...response,
    MediaContainer: {
      ...response.MediaContainer,
      size: hubs.length,
      Hub: hubs,
    },
  };
}

export function getMetadata(
  config: PlexConfig,
  ratingKey: string,
): Promise<GetMetadataResponse> {
  return makeRequest(config, `/library/metadata/${ratingKey}`);
}

/**
 * Get playback history for a specific Plex media item.
 *
 * @param config Plex server configuration.
 * @param ratingKey Plex rating key for a playable item, such as a movie or episode.
 * @param options Optional account, pagination, and timestamp filters.
 * @returns The matching playback-history events.
 */
export function getPlaybackHistory(
  config: PlexConfig,
  ratingKey: string,
  options: Partial<PlaybackHistoryOptions> = {},
): Promise<GetPlaybackHistoryResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("metadataItemID", ratingKey);
  searchParams.set("sort", "viewedAt:desc");

  if (options.accountId !== undefined) {
    searchParams.set("accountID", options.accountId.toString());
  }
  if (options.start !== undefined) {
    searchParams.set("X-Plex-Container-Start", options.start.toString());
  }
  if (options.size !== undefined) {
    searchParams.set("X-Plex-Container-Size", options.size.toString());
  }
  if (options.viewedAtSince !== undefined) {
    searchParams.set("viewedAt>", options.viewedAtSince.toString());
  }

  return makeRequest<GetPlaybackHistoryResponse>(
    config,
    `/status/sessions/history/all?${searchParams.toString()}`,
  );
}

export function refreshLibrary(
  config: PlexConfig,
  key: string,
): Promise<void> {
  return makeRequest(config, `/library/sections/${key}/refresh`);
}

export function getLibraryItems(
  config: PlexConfig,
  sectionKey: string,
  options?: Partial<LibraryItemsOptions>,
): Promise<GetLibraryItemsResponse> {
  const searchParams = new URLSearchParams();

  if (options?.type !== undefined) {
    searchParams.set("type", options.type.toString());
  }
  if (options?.studio !== undefined) {
    searchParams.set("studio", options.studio);
  }
  if (options?.genre !== undefined) {
    searchParams.set("genre", options.genre);
  }
  if (options?.year !== undefined) {
    searchParams.set("year", options.year.toString());
  }
  if (options?.sort !== undefined) {
    searchParams.set("sort", options.sort);
  }
  if (options?.start !== undefined) {
    searchParams.set("X-Plex-Container-Start", options.start.toString());
  }
  if (options?.size !== undefined) {
    searchParams.set("X-Plex-Container-Size", options.size.toString());
  }

  const query = searchParams.toString();
  const endpoint = `/library/sections/${sectionKey}/all${
    query ? `?${query}` : ""
  }`;

  return makeRequest<GetLibraryItemsResponse>(config, endpoint);
}

export function getCollections(
  config: PlexConfig,
  sectionKey: string,
  options?: { start?: number; size?: number },
): Promise<GetCollectionsResponse> {
  const searchParams = new URLSearchParams();
  if (options?.start !== undefined) {
    searchParams.set("X-Plex-Container-Start", options.start.toString());
  }
  if (options?.size !== undefined) {
    searchParams.set("X-Plex-Container-Size", options.size.toString());
  }
  const query = searchParams.toString();
  return makeRequest(
    config,
    `/library/sections/${sectionKey}/collections${query ? `?${query}` : ""}`,
  );
}

export function getCollectionItems(
  config: PlexConfig,
  collectionId: string,
): Promise<GetCollectionItemsResponse> {
  return makeRequest(config, `/library/collections/${collectionId}/children`);
}

// Safely adds a collection tag to an item, preserving existing collection memberships.
// Uses `collection[N].tag.tag` query params; bracket syntax must NOT be URL-encoded.
async function setCollectionTag(
  config: PlexConfig,
  ratingKey: string,
  collectionTitle: string,
): Promise<void> {
  const meta = await getMetadata(config, ratingKey);
  const item = meta.MediaContainer.Metadata[0];
  if (!item) {
    throw new Error(`Item ${ratingKey} not found`);
  }

  const existing = item.Collection ?? [];
  // Already a member — idempotent
  if (existing.some((c) => c.tag === collectionTitle)) return;

  const allTitles = [...existing.map((c) => c.tag), collectionTitle];
  // Build query string manually to preserve literal bracket syntax in keys
  const parts = allTitles.map(
    (tag, i) => `collection[${i}].tag.tag=${encodeURIComponent(tag)}`,
  );
  parts.push("collection.locked=1");

  await makeRequest<void>(
    config,
    `/library/metadata/${ratingKey}?${parts.join("&")}`,
    { method: "PUT" },
  );
}

// Finds a collection by title within a library section.
async function findCollectionByTitle(
  config: PlexConfig,
  sectionKey: string,
  title: string,
): Promise<CollectionMetadataItem | undefined> {
  const result = await getCollections(config, sectionKey, { size: 500 });
  return result.MediaContainer.Metadata?.find((c) => c.title === title);
}

// Creates a new collection by tagging the initial items (Plex auto-creates the collection).
export async function createCollection(
  config: PlexConfig,
  sectionKey: string,
  title: string,
  ratingKeys: readonly string[],
): Promise<CreateCollectionResponse> {
  if (ratingKeys.length === 0) {
    throw new Error("ratingKeys must not be empty");
  }

  for (const ratingKey of ratingKeys) {
    await setCollectionTag(config, ratingKey, title);
  }

  const collection = await findCollectionByTitle(config, sectionKey, title);
  if (!collection) {
    throw new Error(`Collection "${title}" not found after creation`);
  }

  return { MediaContainer: { size: 1, Metadata: [collection] } };
}

// Adds items to an existing collection by looking up its title and tagging each item.
export async function addToCollection(
  config: PlexConfig,
  collectionId: string,
  ratingKeys: readonly string[],
): Promise<void> {
  if (ratingKeys.length === 0) {
    throw new Error("ratingKeys must not be empty");
  }

  const collectionMeta = await getMetadata(config, collectionId);
  const title = collectionMeta.MediaContainer.Metadata[0]?.title;
  if (!title) {
    throw new Error(`Collection ${collectionId} not found`);
  }

  for (const ratingKey of ratingKeys) {
    await setCollectionTag(config, ratingKey, title);
  }
}

export function removeFromCollection(
  config: PlexConfig,
  collectionId: string,
  ratingKey: string,
): Promise<void> {
  return makeRequest<void>(
    config,
    `/library/collections/${collectionId}/items/${ratingKey}`,
    { method: "DELETE" },
  );
}

export function deleteCollection(
  config: PlexConfig,
  collectionId: string,
): Promise<void> {
  return makeRequest<void>(
    config,
    `/library/collections/${collectionId}`,
    { method: "DELETE" },
  );
}

export async function testConnection(
  config: PlexConfig,
): Promise<{ success: boolean; error?: string }> {
  const logger = getLogger(["plex", "connection"]);

  try {
    logger.debug("Testing Plex connection", { baseUrl: config.baseUrl });
    await getCapabilities(config);
    logger.debug("Plex connection test successful");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Plex connection test failed", { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}
