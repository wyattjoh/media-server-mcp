import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { PlexConfig } from "@wyattjoh/plex";
import type { RadarrConfig } from "@wyattjoh/radarr";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import { createPlexTools } from "./plex-tools.ts";
import { createRadarrTools } from "./radarr-tools.ts";
import { createSonarrTools } from "./sonarr-tools.ts";
import { createTMDBTools } from "./tmdb-tools.ts";
import { wrapToolHandler } from "./tool-wrapper.ts";

const SERVICE_NAMES = ["radarr", "sonarr", "tmdb", "plex"] as const;
const POLICY_NAMES = ["read-only", "mutation"] as const;
const MAX_SEARCH_RESULTS = 50;

type ServiceName = (typeof SERVICE_NAMES)[number];
type PolicyName = (typeof POLICY_NAMES)[number];

type ToolRegistration = {
  title?: string;
  description?: string;
  annotations?: { readOnlyHint?: boolean };
};

export interface CodeModeServiceConfig {
  radarrConfig?: RadarrConfig;
  sonarrConfig?: SonarrConfig;
  tmdbConfig?: TMDBConfig;
  plexConfig?: PlexConfig;
}

export interface CodeModeCatalogEntry {
  name: string;
  title: string;
  summary: string;
  service: ServiceName;
  policy: PolicyName;
  available: boolean;
  facadePath: string;
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
};

function toCamelCase(value: string): string {
  return value.replace(
    /_([a-z])/g,
    (_, character: string) => character.toUpperCase(),
  );
}

function createFacadePath(name: string, service: ServiceName): string {
  return `tools.${service}.${toCamelCase(name.slice(service.length + 1))}`;
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
      const policy: PolicyName = registration.annotations?.readOnlyHint === true
        ? "read-only"
        : "mutation";
      entries.push({
        name,
        title: registration.title ?? name,
        summary: registration.description ?? registration.title ?? name,
        service,
        policy,
        available: policy === "read-only",
        facadePath: createFacadePath(name, service),
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
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

/**
 * Registers the stable Code Mode discovery facade.
 */
export function createCodeModeTools(
  server: McpServer,
  catalog: readonly CodeModeCatalogEntry[],
): void {
  server.registerTool(
    "codemode_search",
    {
      title: "Search available media tools",
      description:
        "Search compact metadata for native tools on configured media services.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        query: z.string().max(200).default("").describe(
          "Case-insensitive text matched against tool names, titles, and summaries",
        ),
        services: z.array(z.enum(SERVICE_NAMES)).max(SERVICE_NAMES.length)
          .optional().describe("Configured services to include"),
        policies: z.array(z.enum(POLICY_NAMES)).max(POLICY_NAMES.length)
          .optional().describe("Tool policy classes to include"),
        limit: z.number().int().min(1).max(MAX_SEARCH_RESULTS).default(20),
      },
      outputSchema: SearchOutputSchema,
    },
    wrapToolHandler("codemode_search", (args) => {
      const query = args.query.trim().toLocaleLowerCase();
      const matches = catalog.filter((entry) => {
        if (args.services && !args.services.includes(entry.service)) {
          return false;
        }
        if (args.policies && !args.policies.includes(entry.policy)) {
          return false;
        }
        if (!query) return true;
        return [entry.name, entry.title, entry.summary].some((value) =>
          value.toLocaleLowerCase().includes(query)
        );
      }).slice(0, args.limit);
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify({ matches }) }],
        structuredContent: { matches },
      });
    }),
  );

  for (const name of ["codemode_describe", "codemode_execute"] as const) {
    server.registerTool(
      name,
      {
        title: name === "codemode_describe"
          ? "Describe media tool contracts"
          : "Execute Code Mode JavaScript",
        description:
          `${name} is reserved for the next Code Mode implementation stage.`,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        inputSchema: {},
      },
      wrapToolHandler(name, () => {
        throw new Error(
          `${name} is not available in this implementation stage`,
        );
      }),
    );
  }
}
