# Code Mode

Code Mode replaces the full native tool list with three progressive-discovery tools. It is intended for models that can search for the operation they need, inspect only the relevant contracts, and combine selected read-only operations in one bounded JavaScript computation.

## Enable Code Mode

Configure at least one media service and set the profile:

```bash
TOOL_PROFILE=codemode
deno task start
```

The server advertises only `codemode_search`, `codemode_describe`, and `codemode_execute`. Resources and prompts for configured services remain available. The Code Mode catalog contains every native tool for every configured service regardless of `TOOL_BRANCHES`, `TOOL_INCLUDE`, or `TOOL_EXCLUDE`; those ordinary filtering overrides are ignored for this profile.

## Search, describe, execute

1. Call `codemode_search` with a concise capability query and optional service or policy filters. Search is case-insensitive, normalizes whitespace, and ranks exact native names, exact phrases, all-token matches, then partial token matches; ties retain deterministic catalog order. Results are compact metadata, not executable contracts.
2. Call `codemode_describe` with the exact names selected from search. It returns JSON input/output schemas, annotations, availability, a namespaced facade path, and a TypeScript-style authoring signature.
3. Call `codemode_execute` with JavaScript function-body source and the exact read-only native names in `selectedTools`.

The source is the body of an async JavaScript function. It may use `await` and the immutable `input` and `tools` values directly; do not wrap it in a function and do not submit TypeScript syntax. A selected operation is called through its described facade, such as `tools.tmdb.searchMovies(...)`. Selection is explicit: a facade is absent unless its native name appears in `selectedTools`.

Native failures are catchable `ToolExecutionError` values with stable `name`, `tool`, and `message` fields. The function must explicitly `return` the JSON value that should become the MCP result. Intermediate native results and console diagnostics are not returned automatically.

```js
const [movies, libraries] = await Promise.all([
  tools.tmdb.searchMovies({ query: "Arrival", language: "en-US" }),
  tools.plex.getLibraries({}),
]);

return {
  matches: movies.results.slice(0, 3).map(({ id, title }) => ({ id, title })),
  libraryCount: libraries.length,
};
```

Use `selectedTools: ["tmdb_search_movies", "plex_get_libraries"]` for that source.

## v1 execution scope

All configured-service operations are discoverable so a model can understand the server's complete capability surface. Only explicitly reviewed read-only operations report `available: true` and can execute in v1. Mutation operations remain discoverable with their contracts and an unavailable reason, but cannot be selected or reached from generated code.

Code Mode v1 deliberately excludes:

- mutation approval and execution;
- arbitrary external API or network access from generated code;
- runtime TypeScript compilation;
- persistent generated state between executions;
- standalone compiled-binary packaging of the runner; and
- hostile multi-tenant isolation guarantees.

See [Code Mode security](codemode-security.md) for the authority boundary, optional operating-system containment, and deployment baseline.

## Fixed limits

Limits are server-owned and cannot be raised by generated code or request input.

| Limit                     |    Value | Purpose                                                                                        |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------------- |
| Source                    |   64 KiB | Supports substantial orchestration without accepting program-sized payloads                    |
| JSON input                |   64 KiB | Carries useful request context without becoming bulk storage                                   |
| Protocol frame            |  256 KiB | Fits one maximum native result plus framing overhead                                           |
| Selected tools            |       10 | Bounds facade construction and authorization review per execution                              |
| Native calls              |       20 | Supports multi-step media workflows while bounding service amplification                       |
| Concurrent native calls   |        4 | Allows one call per supported service without a request fan-out spike                          |
| Entire request            |  192 KiB | Bounds source, input, and selected-tool metadata together                                      |
| One native result         |  128 KiB | Supports representative large library/search pages                                             |
| Cumulative native results |  512 KiB | Allows four maximum-size service results without unbounded aggregation                         |
| Diagnostics               |    8 KiB | Preserves useful debug context while draining output floods                                    |
| Final result              |  128 KiB | Encourages explicit projection rather than returning every intermediate result                 |
| Wall clock                | 1 second | Leaves substantial measured startup/orchestration headroom while stopping runaway code quickly |
| Concurrent executions     |        4 | Prevents one client from consuming unbounded child processes                                   |

Run `deno task bench:codemode` to reproduce the benchmark. The benchmark measures child startup, search and describe response sizes, sequential and parallel four-service orchestration, and small and approximately 75 KiB results for Radarr, Sonarr, TMDB, and Plex. It emits machine-readable JSON with all samples, median and p95 timings, output sizes, Deno/platform metadata, and the active limits.

The limits were fixed against Deno 2.9.5 on Apple Silicon. A five-sample release run through the production MCP facade recorded a 33 ms no-tool execution p95, sub-millisecond search/describe calls, 27–31 ms four-service orchestration, and 26–28 ms representative large-result round trips. The 1 second wall-clock limit therefore retains more than 30× observed p95 headroom while remaining an effective runaway-code bound. Result quotas are deliberately close to the useful approximately 75 KiB fixtures instead of the host's available memory.

These measurements characterize executor overhead with deterministic representative results; they do not claim to benchmark Radarr, Sonarr, TMDB, Plex, network, or disk latency. Native calls still share the overall wall-clock limit, so operators should keep service endpoints responsive and return paginated results where supported.
