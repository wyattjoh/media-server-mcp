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

Input schemas are strict. Properties with server defaults are optional in both JSON Schema and the TypeScript-style signature, and omitting them applies the documented default. Unknown properties are rejected before native dispatch instead of being ignored. Described output schemas intentionally model stable envelopes and projection fields while allowing compatible additional upstream metadata where service responses evolve.

Plex `searchTypes` filters are applied locally after `/hubs/search` returns. An omitted or empty filter preserves the upstream response. An explicit filter removes nonmatching metadata and empty hubs and recomputes returned counts; the `tv` category includes shows, seasons, and episodes but excludes movies.

## Fresh Pi release validation

Before a release that changes Code Mode contracts, run the following prompt in a new Pi session connected to a `TOOL_PROFILE=codemode` server with Plex, TMDB, Radarr, and Sonarr configured. This deliberately uses Pi rather than a custom MCP harness so initialization, tool schemas, resource projection, and generated-code authoring are tested as a fresh client sees them.

```text
Validate this media-server MCP's complete Code Mode experience. Do not read its repository or rely on prior knowledge; use only initialization instructions, visible tool/resource descriptions, and observed results. Keep every returned projection small and never expose credentials, URLs, host paths, stack traces, stderr, or raw upstream bodies.

1. Report the Pi version, model/provider, Deno runtime reported by the server if visible, configured media services, every visible media-server tool, and whether media-server initialization instructions were visible. Quote or faithfully summarize the instructions separately from tool descriptions.
2. Confirm the native media tools are suppressed: only codemode_search, codemode_describe, and codemode_execute may be visible as media-server native tools. List any read_* conveniences separately and identify them as client-projected MCP resources, not leaked native tools.
3. Search for "series episodes search lookup" within Sonarr read-only tools and "library search metadata" within Plex read-only tools. Report the ordered matches and confirm repeated calls are deterministic.
4. Describe representative read-only operations for all configured services: Radarr movies or history, Sonarr series or episodes, TMDB movie search, and Plex search or libraries. Confirm required/defaulted input optionality, additionalProperties behavior, useful stable output fields, exact facade paths, and execution availability from the descriptions.
5. Execute a single-service TMDB movie search while omitting its defaulted page and language inputs. Return at most three { id, title } objects.
6. Execute one cross-service read with explicit selectedTools and described facade paths. Include at least two configured services and return only small counts or identity/title fields.
7. Read one configured resource through the client's resource interface or a projected read_* convenience. Report it separately from Code Mode execution.
8. Probe an unknown input property on a read-only native call and confirm rejection occurs before upstream dispatch. Do not retry with malformed or sensitive values.
9. Attempt to select one described mutation in codemode_execute with source that would call it. Confirm selection fails before the mutation runs. Do not invoke any ordinary native mutation tool.
10. If Plex is configured, search for "Star Trek" with searchTypes: ["tv"]. Confirm returned metadata contains only show, season, or episode types, no movie type, no empty hubs, and internally consistent returned counts.
11. Report any schema-loading, connection, validation, execution, or resource error. Inspect all public errors and report whether any credential, upstream body, host path, stack trace, stderr, or unrelated native result leaked.

Separate the final report into: Client/runtime versions; Server initialization instructions; Visible native tools; Projected resources; Described contracts; Empirically observed behavior; Security/error probes; Failures and limitations. Clearly distinguish claims learned from instructions, claims learned from tool descriptions, and behavior observed by calls.
```

A passing run completes search, describe, a single-service read, a cross-service read, and a resource read without connection or schema-loading rejection. It also observes strict unknown-property validation, safe mutation denial, deterministic multi-word discovery, useful four-service projection contracts, and TV-only Plex filtering. Keep the report as release evidence; do not add live credentials, service URLs, or full media-library results to the repository.

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
