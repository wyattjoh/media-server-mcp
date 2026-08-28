import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { PlexConfig } from "@wyattjoh/plex";
import type { RadarrConfig } from "@wyattjoh/radarr";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import { getLogger } from "../logging.ts";
import { createPlexTools } from "./plex-tools.ts";
import { createRadarrTools } from "./radarr-tools.ts";
import { createSonarrTools } from "./sonarr-tools.ts";
import { createTMDBTools } from "./tmdb-tools.ts";
import { executeCodeMode } from "./codemode-executor.ts";
import { withStrictInputSchemas, wrapToolHandler } from "./tool-wrapper.ts";

const SERVICE_NAMES = ["radarr", "sonarr", "tmdb", "plex"] as const;
const POLICY_NAMES = ["read-only", "mutation"] as const;
const MAX_SEARCH_RESULTS = 50;
const MAX_SEARCH_OFFSET = 10_000;
const MAX_DESCRIBE_TOOLS = 10;
const MAX_SELECTED_TOOLS = 10;
const logger = getLogger(["media-server-mcp", "tools", "codemode"]);

type JsonSchema = Record<string, unknown>;
type ServiceName = (typeof SERVICE_NAMES)[number];
type PolicyName = (typeof POLICY_NAMES)[number];
type SearchRank = readonly [tier: number, unmatchedTokens: number];

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, " ");
}

function rankSearchMatch(
  entry: CodeModeCatalogEntry,
  query: string,
  tokens: readonly string[],
): SearchRank | undefined {
  const name = normalizeSearchText(entry.name);
  const fields = [name, entry.title, entry.summary].map(normalizeSearchText);
  if (name === query) return [0, 0];
  if (fields.some((field) => field.includes(query))) return [1, 0];

  const matchedTokens =
    tokens.filter((token) => fields.some((field) => field.includes(token)))
      .length;
  if (matchedTokens === tokens.length) return [2, 0];
  if (matchedTokens > 0) return [3, tokens.length - matchedTokens];
  return undefined;
}

const FACADE_PATHS: Readonly<Record<string, string>> = {
  radarr_search_movie: "tools.radarr.searchMovie",
  radarr_add_movie: "tools.radarr.addMovie",
  radarr_delete_movie: "tools.radarr.deleteMovie",
  radarr_refresh_movie: "tools.radarr.refreshMovie",
  radarr_search_movie_releases: "tools.radarr.searchMovieReleases",
  radarr_get_movies: "tools.radarr.getMovies",
  radarr_get_movie: "tools.radarr.getMovie",
  radarr_get_configuration: "tools.radarr.getConfiguration",
  radarr_update_movie: "tools.radarr.updateMovie",
  radarr_refresh_all_movies: "tools.radarr.refreshAllMovies",
  radarr_disk_scan: "tools.radarr.diskScan",
  radarr_get_wanted_missing: "tools.radarr.getWantedMissing",
  radarr_get_wanted_cutoff: "tools.radarr.getWantedCutoff",
  radarr_get_history: "tools.radarr.getHistory",
  radarr_get_movie_history: "tools.radarr.getMovieHistory",
  radarr_get_calendar: "tools.radarr.getCalendar",
  radarr_get_releases: "tools.radarr.getReleases",
  radarr_grab_release: "tools.radarr.grabRelease",
  radarr_delete_queue_item: "tools.radarr.deleteQueueItem",
  radarr_grab_queue_item: "tools.radarr.grabQueueItem",
  radarr_search_all_missing: "tools.radarr.searchAllMissing",
  radarr_mark_failed: "tools.radarr.markFailed",
  sonarr_search_series: "tools.sonarr.searchSeries",
  sonarr_add_series: "tools.sonarr.addSeries",
  sonarr_delete_series: "tools.sonarr.deleteSeries",
  sonarr_update_episode_monitoring: "tools.sonarr.updateEpisodeMonitoring",
  sonarr_refresh_series: "tools.sonarr.refreshSeries",
  sonarr_search_series_episodes: "tools.sonarr.searchSeriesEpisodes",
  sonarr_search_season: "tools.sonarr.searchSeason",
  sonarr_get_series: "tools.sonarr.getSeries",
  sonarr_get_series_by_id: "tools.sonarr.getSeriesById",
  sonarr_get_episodes: "tools.sonarr.getEpisodes",
  sonarr_get_calendar: "tools.sonarr.getCalendar",
  sonarr_get_queue: "tools.sonarr.getQueue",
  sonarr_get_configuration: "tools.sonarr.getConfiguration",
  sonarr_get_system_status: "tools.sonarr.getSystemStatus",
  sonarr_get_health: "tools.sonarr.getHealth",
  sonarr_update_series: "tools.sonarr.updateSeries",
  sonarr_get_episode: "tools.sonarr.getEpisode",
  sonarr_refresh_all_series: "tools.sonarr.refreshAllSeries",
  sonarr_search_episodes: "tools.sonarr.searchEpisodes",
  sonarr_disk_scan: "tools.sonarr.diskScan",
  sonarr_get_wanted_missing: "tools.sonarr.getWantedMissing",
  sonarr_get_wanted_cutoff: "tools.sonarr.getWantedCutoff",
  sonarr_get_history: "tools.sonarr.getHistory",
  sonarr_get_series_history: "tools.sonarr.getSeriesHistory",
  sonarr_get_releases: "tools.sonarr.getReleases",
  sonarr_grab_release: "tools.sonarr.grabRelease",
  sonarr_delete_queue_item: "tools.sonarr.deleteQueueItem",
  sonarr_grab_queue_item: "tools.sonarr.grabQueueItem",
  sonarr_search_all_missing: "tools.sonarr.searchAllMissing",
  sonarr_mark_failed: "tools.sonarr.markFailed",
  tmdb_find_by_external_id: "tools.tmdb.findByExternalId",
  tmdb_search_movies: "tools.tmdb.searchMovies",
  tmdb_search_tv: "tools.tmdb.searchTv",
  tmdb_search_multi: "tools.tmdb.searchMulti",
  tmdb_get_popular_movies: "tools.tmdb.getPopularMovies",
  tmdb_discover_movies: "tools.tmdb.discoverMovies",
  tmdb_discover_tv: "tools.tmdb.discoverTv",
  tmdb_get_genres: "tools.tmdb.getGenres",
  tmdb_get_trending: "tools.tmdb.getTrending",
  tmdb_get_now_playing_movies: "tools.tmdb.getNowPlayingMovies",
  tmdb_get_top_rated_movies: "tools.tmdb.getTopRatedMovies",
  tmdb_get_upcoming_movies: "tools.tmdb.getUpcomingMovies",
  tmdb_get_popular_tv: "tools.tmdb.getPopularTv",
  tmdb_get_top_rated_tv: "tools.tmdb.getTopRatedTv",
  tmdb_get_on_the_air_tv: "tools.tmdb.getOnTheAirTv",
  tmdb_get_airing_today_tv: "tools.tmdb.getAiringTodayTv",
  tmdb_get_movie_details: "tools.tmdb.getMovieDetails",
  tmdb_get_tv_details: "tools.tmdb.getTvDetails",
  tmdb_get_movie_recommendations: "tools.tmdb.getMovieRecommendations",
  tmdb_get_tv_recommendations: "tools.tmdb.getTvRecommendations",
  tmdb_get_similar_movies: "tools.tmdb.getSimilarMovies",
  tmdb_get_similar_tv: "tools.tmdb.getSimilarTv",
  tmdb_search_people: "tools.tmdb.searchPeople",
  tmdb_get_popular_people: "tools.tmdb.getPopularPeople",
  tmdb_get_person_details: "tools.tmdb.getPersonDetails",
  tmdb_get_person_movie_credits: "tools.tmdb.getPersonMovieCredits",
  tmdb_get_person_tv_credits: "tools.tmdb.getPersonTvCredits",
  tmdb_search_collections: "tools.tmdb.searchCollections",
  tmdb_get_collection_details: "tools.tmdb.getCollectionDetails",
  tmdb_search_keywords: "tools.tmdb.searchKeywords",
  tmdb_get_movies_by_keyword: "tools.tmdb.getMoviesByKeyword",
  tmdb_get_certifications: "tools.tmdb.getCertifications",
  tmdb_get_watch_providers: "tools.tmdb.getWatchProviders",
  tmdb_get_configuration: "tools.tmdb.getConfiguration",
  tmdb_get_countries: "tools.tmdb.getCountries",
  tmdb_get_languages: "tools.tmdb.getLanguages",
  tmdb_get_movie_credits: "tools.tmdb.getMovieCredits",
  tmdb_get_tv_credits: "tools.tmdb.getTvCredits",
  plex_get_capabilities: "tools.plex.getCapabilities",
  plex_get_libraries: "tools.plex.getLibraries",
  plex_get_accounts: "tools.plex.getAccounts",
  plex_search: "tools.plex.search",
  plex_get_metadata: "tools.plex.getMetadata",
  plex_refresh_library: "tools.plex.refreshLibrary",
  plex_get_library_items: "tools.plex.getLibraryItems",
  plex_get_playback_history: "tools.plex.getPlaybackHistory",
  plex_get_collections: "tools.plex.getCollections",
  plex_get_collection_items: "tools.plex.getCollectionItems",
  plex_create_collection: "tools.plex.createCollection",
  plex_add_to_collection: "tools.plex.addToCollection",
  plex_remove_from_collection: "tools.plex.removeFromCollection",
  plex_delete_collection: "tools.plex.deleteCollection",
};

const EXECUTABLE_READ_ONLY_TOOLS = [
  "radarr_search_movie",
  "radarr_get_movies",
  "radarr_get_movie",
  "radarr_get_configuration",
  "radarr_get_wanted_missing",
  "radarr_get_wanted_cutoff",
  "radarr_get_history",
  "radarr_get_movie_history",
  "radarr_get_calendar",
  "radarr_get_releases",
  "sonarr_search_series",
  "sonarr_get_series",
  "sonarr_get_series_by_id",
  "sonarr_get_episodes",
  "sonarr_get_calendar",
  "sonarr_get_queue",
  "sonarr_get_configuration",
  "sonarr_get_system_status",
  "sonarr_get_health",
  "sonarr_get_episode",
  "sonarr_get_wanted_missing",
  "sonarr_get_wanted_cutoff",
  "sonarr_get_history",
  "sonarr_get_series_history",
  "sonarr_get_releases",
  "tmdb_find_by_external_id",
  "tmdb_search_movies",
  "tmdb_search_tv",
  "tmdb_search_multi",
  "tmdb_get_popular_movies",
  "tmdb_discover_movies",
  "tmdb_discover_tv",
  "tmdb_get_genres",
  "tmdb_get_trending",
  "tmdb_get_now_playing_movies",
  "tmdb_get_top_rated_movies",
  "tmdb_get_upcoming_movies",
  "tmdb_get_popular_tv",
  "tmdb_get_top_rated_tv",
  "tmdb_get_on_the_air_tv",
  "tmdb_get_airing_today_tv",
  "tmdb_get_movie_details",
  "tmdb_get_tv_details",
  "tmdb_get_movie_recommendations",
  "tmdb_get_tv_recommendations",
  "tmdb_get_similar_movies",
  "tmdb_get_similar_tv",
  "tmdb_search_people",
  "tmdb_get_popular_people",
  "tmdb_get_person_details",
  "tmdb_get_person_movie_credits",
  "tmdb_get_person_tv_credits",
  "tmdb_search_collections",
  "tmdb_get_collection_details",
  "tmdb_search_keywords",
  "tmdb_get_movies_by_keyword",
  "tmdb_get_certifications",
  "tmdb_get_watch_providers",
  "tmdb_get_configuration",
  "tmdb_get_countries",
  "tmdb_get_languages",
  "tmdb_get_movie_credits",
  "tmdb_get_tv_credits",
  "plex_get_capabilities",
  "plex_get_libraries",
  "plex_get_accounts",
  "plex_search",
  "plex_get_metadata",
  "plex_get_library_items",
  "plex_get_playback_history",
  "plex_get_collections",
  "plex_get_collection_items",
] as const;

const DISCOVERABLE_NON_EXECUTABLE_TOOLS = [
  "radarr_add_movie",
  "radarr_delete_movie",
  "radarr_refresh_movie",
  "radarr_search_movie_releases",
  "radarr_update_movie",
  "radarr_refresh_all_movies",
  "radarr_disk_scan",
  "radarr_grab_release",
  "radarr_delete_queue_item",
  "radarr_grab_queue_item",
  "radarr_search_all_missing",
  "radarr_mark_failed",
  "sonarr_add_series",
  "sonarr_delete_series",
  "sonarr_update_episode_monitoring",
  "sonarr_refresh_series",
  "sonarr_search_series_episodes",
  "sonarr_search_season",
  "sonarr_update_series",
  "sonarr_refresh_all_series",
  "sonarr_search_episodes",
  "sonarr_disk_scan",
  "sonarr_grab_release",
  "sonarr_delete_queue_item",
  "sonarr_grab_queue_item",
  "sonarr_search_all_missing",
  "sonarr_mark_failed",
  "plex_refresh_library",
  "plex_create_collection",
  "plex_add_to_collection",
  "plex_remove_from_collection",
  "plex_delete_collection",
] as const;

const CODE_MODE_TOOL_POLICIES: Readonly<Record<string, PolicyName>> = Object
  .freeze(Object.fromEntries([
    ...EXECUTABLE_READ_ONLY_TOOLS.map((name) => [name, "read-only"] as const),
    ...DISCOVERABLE_NON_EXECUTABLE_TOOLS.map((name) =>
      [name, "mutation"] as const
    ),
  ]));

const facadeNames = Object.keys(FACADE_PATHS).sort();
const policyNames = Object.keys(CODE_MODE_TOOL_POLICIES).sort();
if (JSON.stringify(facadeNames) !== JSON.stringify(policyNames)) {
  throw new Error("Code Mode facade and reviewed policy catalogs differ");
}

type ToolRegistration = {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: Record<string, unknown> & { readOnlyHint?: boolean };
};

/**
 * Service configurations used to construct the Code Mode catalog.
 */
export interface CodeModeServiceConfig {
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
}

/**
 * Exact native tool metadata retained by the Code Mode catalog.
 */
export interface CodeModeCatalogEntry {
  name: string;
  title: string;
  summary: string;
  service: ServiceName;
  policy: PolicyName;
  available: boolean;
  facadePath: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  annotations: Record<string, unknown>;
}

const SearchOutputSchema = {
  matches: z.array(z.object({
    name: z.string(),
    title: z.string(),
    summary: z.string(),
    service: z.enum(SERVICE_NAMES),
    policy: z.enum(POLICY_NAMES),
    available: z.boolean(),
    facadePath: z.string(),
  })),
  total: z.number().int().nonnegative(),
  returned: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
};

const ExecuteOutputSchema = {
  result: z.json(),
};

const DescribeOutputSchema = {
  descriptions: z.array(z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    service: z.enum(SERVICE_NAMES),
    inputSchema: z.record(z.string(), z.unknown()),
    outputSchema: z.record(z.string(), z.unknown()),
    annotations: z.record(z.string(), z.unknown()),
    policy: z.enum(POLICY_NAMES),
    available: z.boolean(),
    availabilityReason: z.string(),
    facadePath: z.string(),
    signature: z.string(),
  })),
};

function getFacadePath(name: string): string {
  const facadePath = FACADE_PATHS[name];
  if (!facadePath) {
    throw new Error(`Missing reviewed Code Mode facade path for: ${name}`);
  }
  return facadePath;
}

function toJsonSchema(
  schema: unknown,
  io: "input" | "output" = "output",
): JsonSchema {
  if (!schema) return { type: "object", properties: {} };
  const zodSchema = schema instanceof z.ZodType
    ? schema
    : z.object(schema as z.ZodRawShape);
  return z.toJSONSchema(zodSchema, { io }) as JsonSchema;
}

function toTypeScriptType(schema: JsonSchema): string {
  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => toTypeScriptType({ ...schema, type }))
      .join(" | ");
  }
  if (schema.enum && Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (schema.type === "array") {
    return `${toTypeScriptType(schema.items as JsonSchema)}[]`;
  }
  if (schema.type === "object") {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set((schema.required ?? []) as string[]);
    const fields = Object.entries(properties).map(([name, property]) =>
      `${name}${required.has(name) ? "" : "?"}: ${toTypeScriptType(property)}`
    );
    const additionalProperties = schema.additionalProperties;
    if (
      fields.length === 0 && additionalProperties !== null &&
      typeof additionalProperties === "object"
    ) {
      return `Record<string, ${
        toTypeScriptType(additionalProperties as JsonSchema)
      }>`;
    }
    return `{ ${fields.join("; ")} }`;
  }
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "string") return "string";
  return "unknown";
}

function captureServiceTools(
  service: ServiceName,
  register: (server: McpServer) => void,
): CodeModeCatalogEntry[] {
  const entries: CodeModeCatalogEntry[] = [];
  const collector = {
    registerTool(
      name: string,
      registration: ToolRegistration,
      _handler: unknown,
    ): void {
      const policy = CODE_MODE_TOOL_POLICIES[name];
      if (!policy) {
        throw new Error(`Missing reviewed Code Mode policy for: ${name}`);
      }
      if (!registration.outputSchema) {
        throw new Error(`Missing structured output schema for: ${name}`);
      }
      entries.push({
        name,
        title: registration.title ?? name,
        summary: registration.description ?? registration.title ?? name,
        service,
        policy,
        available: policy === "read-only",
        facadePath: getFacadePath(name),
        inputSchema: toJsonSchema(registration.inputSchema, "input"),
        outputSchema: toJsonSchema(registration.outputSchema),
        annotations: registration.annotations ?? {},
      });
    },
  } as unknown as McpServer;
  register(collector);
  return entries;
}

/**
 * Builds the deterministic native-tool catalog for configured services.
 */
export function createCodeModeCatalog(
  config: Readonly<CodeModeServiceConfig>,
): CodeModeCatalogEntry[] {
  const entries: CodeModeCatalogEntry[] = [];
  if (config.radarrConfig) {
    entries.push(
      ...captureServiceTools(
        "radarr",
        (server) => createRadarrTools(server, config.radarrConfig!, () => true),
      ),
    );
  }
  if (config.sonarrConfig) {
    entries.push(
      ...captureServiceTools(
        "sonarr",
        (server) => createSonarrTools(server, config.sonarrConfig!, () => true),
      ),
    );
  }
  if (config.tmdbConfig) {
    entries.push(
      ...captureServiceTools(
        "tmdb",
        (server) => createTMDBTools(server, config.tmdbConfig!, () => true),
      ),
    );
  }
  if (config.plexConfig) {
    entries.push(
      ...captureServiceTools(
        "plex",
        (server) => createPlexTools(server, config.plexConfig!, () => true),
      ),
    );
  }
  const sorted = entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const facadePaths = new Set<string>();
  for (const entry of sorted) {
    if (facadePaths.has(entry.facadePath)) {
      throw new Error(`Duplicate Code Mode facade path: ${entry.facadePath}`);
    }
    facadePaths.add(entry.facadePath);
  }
  return sorted;
}

type NativeDispatcher = {
  call: (name: string, args: unknown) => Promise<unknown>;
  close: () => Promise<void>;
};

async function createNativeDispatcher(
  config: Readonly<CodeModeServiceConfig>,
): Promise<NativeDispatcher> {
  const nativeServer = new McpServer(
    { name: "codemode-native-dispatch", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  if (config.radarrConfig) {
    createRadarrTools(nativeServer, config.radarrConfig, () => true);
  }
  if (config.sonarrConfig) {
    createSonarrTools(nativeServer, config.sonarrConfig, () => true);
  }
  if (config.tmdbConfig) {
    createTMDBTools(nativeServer, config.tmdbConfig, () => true);
  }
  if (config.plexConfig) {
    createPlexTools(nativeServer, config.plexConfig, () => true);
  }

  const [clientTransport, serverTransport] = InMemoryTransport
    .createLinkedPair();
  await nativeServer.connect(serverTransport);
  const client = new Client({ name: "codemode-dispatch", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    call: async (name, args) => {
      const response = await client.callTool({
        name,
        arguments: args as Record<string, unknown>,
      });
      if (response.isError) {
        logger.debug("Code Mode native tool failed", {
          toolName: name,
          error: response.content,
        });
        throw new Error("Native tool execution failed");
      }
      if (response.structuredContent === undefined) {
        throw new Error("Native tool returned no structured content");
      }
      return response.structuredContent;
    },
    close: () => client.close(),
  };
}

/**
 * Registers the stable Code Mode discovery facade.
 */
export function createCodeModeTools(
  server: McpServer,
  catalog: readonly CodeModeCatalogEntry[],
  config: Readonly<CodeModeServiceConfig>,
): void {
  server = withStrictInputSchemas(server);
  server.registerTool(
    "codemode_search",
    {
      title: "Search available media tools",
      description:
        "Search compact metadata for all native tools on configured services. Page through all matches with offset and hasMore, then use returned exact names with codemode_describe; discoverable mutation tools are unavailable to execute in Code Mode v1.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        query: z.string().max(200).default("").describe(
          "Case-insensitive phrase and token search across tool names, titles, and summaries",
        ),
        services: z.array(z.enum(SERVICE_NAMES)).max(SERVICE_NAMES.length)
          .optional().describe("Configured services to include"),
        policies: z.array(z.enum(POLICY_NAMES)).max(POLICY_NAMES.length)
          .optional().describe("Tool policy classes to include"),
        limit: z.number().int().min(1).max(MAX_SEARCH_RESULTS).default(20),
        offset: z.number().int().min(0).max(MAX_SEARCH_OFFSET).default(0)
          .describe("Zero-based offset into the stable filtered result set"),
      },
      outputSchema: SearchOutputSchema,
    },
    wrapToolHandler("codemode_search", (args) => {
      const query = normalizeSearchText(args.query);
      const tokens = query ? query.split(" ") : [];
      const rankedMatches = catalog.map((entry, index) => ({ entry, index }))
        .filter(({ entry }) =>
          (!args.services || args.services.includes(entry.service)) &&
          (!args.policies || args.policies.includes(entry.policy))
        )
        .map(({ entry, index }) => ({
          entry,
          index,
          rank: query ? rankSearchMatch(entry, query, tokens) : [0, 0],
        }))
        .filter((match): match is typeof match & { rank: SearchRank } =>
          match.rank !== undefined
        )
        .sort((left, right) =>
          left.rank[0] - right.rank[0] ||
          left.rank[1] - right.rank[1] ||
          left.index - right.index
        );
      const total = rankedMatches.length;
      const matches = rankedMatches.slice(args.offset, args.offset + args.limit)
        .map(({ entry }) => ({
          name: entry.name,
          title: entry.title,
          summary: entry.summary,
          service: entry.service,
          policy: entry.policy,
          available: entry.available,
          facadePath: entry.facadePath,
        }));
      const result = {
        matches,
        total,
        returned: matches.length,
        offset: args.offset,
        hasMore: args.offset + matches.length < total,
      };
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      });
    }),
  );

  server.registerTool(
    "codemode_describe",
    {
      title: "Describe media tool contracts",
      description:
        "Describe exact schemas, TypeScript-style signatures, facade paths, and execution availability for selected native tool names before writing JavaScript.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        names: z.array(z.string().min(1).max(100)).min(1)
          .max(MAX_DESCRIBE_TOOLS).refine(
            (names) => new Set(names).size === names.length,
            "Tool names must be unique",
          ).describe("Exact native tool names to describe"),
      },
      outputSchema: DescribeOutputSchema,
    },
    wrapToolHandler("codemode_describe", (args) => {
      const entriesByName = new Map(
        catalog.map((entry) => [entry.name, entry]),
      );
      const unknown = args.names.filter((name) => !entriesByName.has(name));
      if (unknown.length > 0) {
        throw new Error(`Unknown or unavailable tools: ${unknown.join(", ")}`);
      }
      const descriptions = args.names.map((name) => {
        const entry = entriesByName.get(name)!;
        const availabilityReason = entry.available
          ? "Executable through Code Mode v1"
          : "Discoverable only; mutation tools are not executable in Code Mode v1";
        return {
          name: entry.name,
          title: entry.title,
          description: entry.summary,
          service: entry.service,
          inputSchema: entry.inputSchema,
          outputSchema: entry.outputSchema,
          annotations: entry.annotations,
          policy: entry.policy,
          available: entry.available,
          availabilityReason,
          facadePath: entry.facadePath,
          signature: `${entry.facadePath}(input: ${
            toTypeScriptType(entry.inputSchema)
          }): Promise<${
            toTypeScriptType(entry.outputSchema)
          }>; // TypeScript-style authoring reference; submit JavaScript source`,
        };
      });
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify({ descriptions }) }],
        structuredContent: { descriptions },
      });
    }),
  );

  server.registerTool(
    "codemode_execute",
    {
      title: "Execute Code Mode JavaScript",
      description:
        "Execute a bounded JavaScript async-function body in a fresh no-I/O subprocess. Select exact read-only tool names first, call their namespaced tools.service.operation facades, catch ToolExecutionError for native failures, and explicitly return the JSON result to expose.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        source: z.string().min(1).max(65_536).describe(
          "JavaScript async-function-body source: use await directly, call selected namespaced tool facades, and explicitly return a JSON value; TypeScript syntax is not transpiled",
        ),
        input: z.json().optional().describe(
          "Optional JSON value exposed to the function body as input",
        ),
        selectedTools: z.array(z.string().min(1).max(100))
          .max(MAX_SELECTED_TOOLS).refine(
            (names) => new Set(names).size === names.length,
            "Selected tool names must be unique",
          ).default([]).describe(
            "Exact native read-only tool names authorized for this execution; every called facade must be selected explicitly",
          ),
      },
      outputSchema: ExecuteOutputSchema,
    },
    wrapToolHandler("codemode_execute", async (args) => {
      const entriesByName = new Map(
        catalog.map((entry) => [entry.name, entry]),
      );
      const selected = args.selectedTools.map((name) => {
        const entry = entriesByName.get(name);
        if (!entry || !entry.available || entry.policy !== "read-only") {
          throw new Error(`Tool is not executable: ${name}`);
        }
        return entry;
      });
      const dispatcher = await createNativeDispatcher(config);
      try {
        const result = await executeCodeMode(
          args.source,
          args.input ?? null,
          selected.map((entry) => ({
            name: entry.name,
            facadePath: entry.facadePath,
          })),
          dispatcher.call,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: { result },
        };
      } finally {
        await dispatcher.close();
      }
    }),
  );
}
