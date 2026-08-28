import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createPlexConfig } from "@wyattjoh/plex";
import { createRadarrConfig } from "@wyattjoh/radarr";
import { createSonarrConfig } from "@wyattjoh/sonarr";
import { createTMDBConfig } from "@wyattjoh/tmdb";
import { createMcpServerWithTools } from "../src/server-factory.ts";
import { CODEMODE_LIMITS } from "../src/tools/codemode-executor.ts";
import { createToolFilter } from "../src/tools/tool-filter.ts";

const encoder = new TextEncoder();
const repetitions = Number(Deno.env.get("CODEMODE_BENCH_REPETITIONS") ?? "5");
if (!Number.isInteger(repetitions) || repetitions < 1) {
  throw new Error("CODEMODE_BENCH_REPETITIONS must be a positive integer");
}
const services = {
  radarrConfig: createRadarrConfig("http://localhost:7878", "benchmark-key"),
  sonarrConfig: createSonarrConfig("http://localhost:8989", "benchmark-key"),
  tmdbConfig: createTMDBConfig("benchmark-key"),
  plexConfig: createPlexConfig("http://localhost:32400", "benchmark-key"),
};
const describedToolNames = [
  "radarr_get_movies",
  "radarr_get_configuration",
  "sonarr_get_series",
  "sonarr_get_episodes",
  "tmdb_search_movies",
  "tmdb_discover_movies",
  "plex_get_libraries",
  "plex_get_library_items",
];
const selectedToolNames = [
  "radarr_get_movies",
  "sonarr_get_series",
  "tmdb_search_movies",
  "plex_get_libraries",
];
const facadeByName = {
  radarr_get_movies: "tools.radarr.getMovies",
  sonarr_get_series: "tools.sonarr.getSeries",
  tmdb_search_movies: "tools.tmdb.searchMovies",
  plex_get_libraries: "tools.plex.getLibraries",
} as const;
const callArgumentsByName = {
  radarr_get_movies: {},
  sonarr_get_series: {},
  tmdb_search_movies: { query: "Arrival", language: "en-US" },
  plex_get_libraries: {},
} as const;
let fixtureItemCount = 1;

type Measurement = {
  name: string;
  samplesMs: number[];
  medianMs: number;
  p95Ms: number;
  outputBytes: number | undefined;
};

function representativeItems(
  service: "radarr" | "sonarr" | "tmdb" | "plex",
): Array<Record<string, unknown>> {
  return Array.from({ length: fixtureItemCount }, (_, id) => ({
    id,
    ...service === "radarr" ? { tmdbId: id, year: 2024 } : {},
    ...service === "sonarr" ? { tvdbId: id, year: 2024 } : {},
    ...service === "plex" ? { key: String(id), type: "movie" } : {},
    title: `Representative media item ${id}`,
    summary: "x".repeat(160),
  }));
}

function percentile(samples: readonly number[], fraction: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  ];
}

async function measure(
  name: string,
  operation: () => Promise<unknown>,
): Promise<Measurement> {
  const samplesMs: number[] = [];
  let output: unknown;
  for (let index = 0; index < repetitions; index++) {
    const startedAt = performance.now();
    try {
      output = await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${name}: ${message}`);
    }
    samplesMs.push(Number((performance.now() - startedAt).toFixed(2)));
  }
  return {
    name,
    samplesMs,
    medianMs: percentile(samplesMs, 0.5),
    p95Ms: percentile(samplesMs, 0.95),
    outputBytes: output === undefined
      ? undefined
      : encoder.encode(JSON.stringify(output)).length,
  };
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (input) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url.includes("localhost:7878/api/v3/movie")) {
    return Promise.resolve(Response.json(representativeItems("radarr")));
  }
  if (url.includes("localhost:8989/api/v3/series")) {
    return Promise.resolve(Response.json(representativeItems("sonarr")));
  }
  if (url.includes("api.themoviedb.org/3/search/movie")) {
    const items = representativeItems("tmdb");
    return Promise.resolve(Response.json({
      page: 1,
      total_pages: 1,
      total_results: items.length,
      results: items,
    }));
  }
  if (url.includes("localhost:32400/library/sections")) {
    const items = representativeItems("plex");
    return Promise.resolve(Response.json({
      MediaContainer: {
        size: items.length,
        title1: "Plex Library",
        Directory: items,
      },
    }));
  }
  return Promise.resolve(
    new Response("unexpected benchmark request", {
      status: 500,
    }),
  );
};

const server = createMcpServerWithTools({
  ...services,
  isToolEnabled: createToolFilter({
    profile: "codemode",
    additionalBranches: [],
    excludeTools: [],
    includeTools: [],
  }),
  isCodeMode: true,
});
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const client = new Client({ name: "codemode-benchmark", version: "1.0.0" });
await client.connect(clientTransport);

const execute = async (source: string, selectedTools: readonly string[]) => {
  const response = await client.callTool({
    name: "codemode_execute",
    arguments: { source, selectedTools },
  });
  if (response.isError) {
    throw new Error(
      `Benchmark execution failed: ${JSON.stringify(response.content)}`,
    );
  }
  return response;
};
const measurements: Measurement[] = [];
try {
  measurements.push(
    await measure("child-cold-start", () => execute("return 42;", [])),
    await measure("search-four-services", async () =>
      await Promise.all(
        ["radarr", "sonarr", "tmdb", "plex"].map((service) =>
          client.callTool({
            name: "codemode_search",
            arguments: { query: "", services: [service], limit: 20 },
          })
        ),
      )),
    await measure("describe-eight-four-services", () =>
      client.callTool({
        name: "codemode_describe",
        arguments: { names: describedToolNames },
      })),
  );

  fixtureItemCount = 1;
  measurements.push(
    await measure("sequential-four-services", () =>
      execute(
        "const radarr = await tools.radarr.getMovies({}); const sonarr = await tools.sonarr.getSeries({}); const tmdb = await tools.tmdb.searchMovies({ query: 'Arrival', language: 'en-US' }); const plex = await tools.plex.getLibraries({}); return [radarr.returned, sonarr.returned, tmdb.total_results, plex.MediaContainer.size];",
        selectedToolNames,
      )),
    await measure("parallel-four-services", () =>
      execute(
        "const [radarr, sonarr, tmdb, plex] = await Promise.all([tools.radarr.getMovies({}), tools.sonarr.getSeries({}), tools.tmdb.searchMovies({ query: 'Arrival', language: 'en-US' }), tools.plex.getLibraries({})]); return [radarr.returned, sonarr.returned, tmdb.total_results, plex.MediaContainer.size];",
        selectedToolNames,
      )),
  );

  for (const name of selectedToolNames) {
    for (const size of ["small", "large"] as const) {
      fixtureItemCount = size === "small" ? 1 : 350;
      measurements.push(
        await measure(`${name}-${size}`, () =>
          execute(
            `return await ${facadeByName[name as keyof typeof facadeByName]}(${
              JSON.stringify(
                callArgumentsByName[name as keyof typeof callArgumentsByName],
              )
            });`,
            [name],
          )),
      );
    }
  }
} finally {
  await client.close();
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify(
  {
    deno: Deno.version.deno,
    platform: `${Deno.build.os}-${Deno.build.arch}`,
    repetitions,
    limits: CODEMODE_LIMITS,
    measurements,
  },
  null,
  2,
));
