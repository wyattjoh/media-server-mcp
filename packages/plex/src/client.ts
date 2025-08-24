import { getLogger } from "@logtape/logtape";
import {
  GetCapabilitiesResponse,
  GetLibrariesResponse,
  GetMetadataResponse,
  SearchResponse,
  SearchType,
} from "./types.ts";

export interface PlexConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export function createPlexConfig(baseUrl: string, apiKey: string): PlexConfig {
  return {
    baseUrl,
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
    });

    if (!response.ok) {
      logger.error("API request failed: {status} {statusText}", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        method: options.method || "GET",
        url,
      });

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

export function search(
  config: PlexConfig,
  query: string,
  limit: number = 100,
  searchTypes: readonly SearchType[] = [],
): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("query", query);
  searchParams.set("limit", limit.toString());
  if (searchTypes.length > 0) {
    searchParams.set("searchTypes", searchTypes.join(","));
  }

  return makeRequest<SearchResponse>(
    config,
    `/search?${searchParams.toString()}`,
  );
}

export function getMetadata(
  config: PlexConfig,
  ratingKey: string,
): Promise<GetMetadataResponse> {
  return makeRequest(config, `/library/metadata/${ratingKey}`);
}

export function refreshLibrary(
  config: PlexConfig,
  key: string,
): Promise<void> {
  return makeRequest(config, `/library/sections/${key}/refresh`);
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
