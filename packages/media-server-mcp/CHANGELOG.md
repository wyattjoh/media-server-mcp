# Changelog

## [2.3.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/media-server-mcp-v2.2.0...@wyattjoh/media-server-mcp-v2.3.0) (2026-08-12)


### Features

* **mcp:** adopt stateless protocol ([49578e0](https://github.com/wyattjoh/media-server-mcp/commit/49578e04ec4b7d66aabdb3b5ce953cea9d4753e5))


### Bug Fixes

* **history:** map event names to API identifiers ([33e88ed](https://github.com/wyattjoh/media-server-mcp/commit/33e88edd90497f99d1972e7a6f3154c92a53959c))
* **mcp:** address migration review findings ([9cc1b44](https://github.com/wyattjoh/media-server-mcp/commit/9cc1b445e935744f337f8de95ff2dfac8161d30e))
* **mcp:** align tool response types ([00b06ff](https://github.com/wyattjoh/media-server-mcp/commit/00b06ff7fe18b010734e0a06b1a421452533e0d4))
* **sonarr:** preserve queue pagination metadata ([49c65d9](https://github.com/wyattjoh/media-server-mcp/commit/49c65d95c7dd365d4c39bbe055ee94a0528b1bd6))
* **sonarr:** return queue output matching schema ([bc90d31](https://github.com/wyattjoh/media-server-mcp/commit/bc90d31f4e9351d4a995108e4b20f82a5ea7354e))
* **test:** close transport test resources ([dfa22d8](https://github.com/wyattjoh/media-server-mcp/commit/dfa22d8b3ce32b38fd124067280535eabb44cb55))

## [2.2.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/media-server-mcp-v2.1.1...@wyattjoh/media-server-mcp-v2.2.0) (2026-05-18)


### Features

* add media management tools for wanted/missing, history, releases, and queue ([da8e466](https://github.com/wyattjoh/media-server-mcp/commit/da8e466479c4d3e242b39fa1514c91602d96e976))
* **mcp:** add new media management tools to download-management category ([6089d1d](https://github.com/wyattjoh/media-server-mcp/commit/6089d1df99ad815efd28a3618a2ad4f0146f7f22))
* **mcp:** add radarr release search/grab, queue management, search-all-missing, and mark-failed tools ([ce938fd](https://github.com/wyattjoh/media-server-mcp/commit/ce938fd041b5200af1df186ed589faa1100a3be6))
* **mcp:** add radarr wanted/missing, cutoff, history, and calendar tools ([47029df](https://github.com/wyattjoh/media-server-mcp/commit/47029df268a583a9432c10afea54ed5593aa90f4))
* **mcp:** add sonarr release search/grab, queue management, search-all-missing, and mark-failed tools ([a30f1b1](https://github.com/wyattjoh/media-server-mcp/commit/a30f1b1d790bcd459f1ff4ae957b2c20b6331bfe))
* **mcp:** add sonarr wanted/missing, cutoff, history, and series history tools ([8ae32e2](https://github.com/wyattjoh/media-server-mcp/commit/8ae32e2066504911b645533a2278aadbfdf55ea2))

## [2.1.1](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/media-server-mcp-v2.1.0...@wyattjoh/media-server-mcp-v2.1.1) (2026-03-23)


### Bug Fixes

* replace z.record with z.object().catchall() in outputSchema for Zod v4 compatibility ([aacd755](https://github.com/wyattjoh/media-server-mcp/commit/aacd755e8deab37292ed8cf7891a2991af8c7326))

## [2.1.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/media-server-mcp-v2.0.0...@wyattjoh/media-server-mcp-v2.1.0) (2026-03-23)


### Features

* MCP improvements - resources, prompts, annotations, structured output, error handling ([#7](https://github.com/wyattjoh/media-server-mcp/issues/7)) ([b252f6f](https://github.com/wyattjoh/media-server-mcp/commit/b252f6f216203c53f673cce858876d60ad18c40c))

## [2.0.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/media-server-mcp-v1.5.0...@wyattjoh/media-server-mcp-v2.0.0) (2026-03-23)


### ⚠ BREAKING CHANGES

* **security:** SSE mode now requires MCP_AUTH_TOKEN environment variable
* migrate from server.tool to server.registerTool API
* Tool argument validation moved from manual parsing to MCP framework
* MCP tools are no longer exported from individual client packages
* Project structure completely reorganized from single package to workspace monorepo.

### Features

* add comprehensive logging system with LogTape integration ([ae46097](https://github.com/wyattjoh/media-server-mcp/commit/ae4609778280b5f9ef11a8a8992f6d39c2d7a6b0))
* add Plex media server integration ([eeb4b44](https://github.com/wyattjoh/media-server-mcp/commit/eeb4b441c8c0b83c3320474585d62edc5c7bc60d))
* add polymorphic ID lookup for Radarr and Sonarr clients ([3e925b8](https://github.com/wyattjoh/media-server-mcp/commit/3e925b8f304d45b7dcb08d0c7321a22775ec8f2e))
* add Streamable HTTP transport for remote MCP server access ([#2](https://github.com/wyattjoh/media-server-mcp/issues/2)) ([143c394](https://github.com/wyattjoh/media-server-mcp/commit/143c39444608b8655d70afdac5c7906546a69364))
* add structured logging to all client packages and update docs ([94fec3d](https://github.com/wyattjoh/media-server-mcp/commit/94fec3df91ee099e42e38b4cb344e9a9c78d5f89))
* add tool segmentation system with branch-based filtering ([9975905](https://github.com/wyattjoh/media-server-mcp/commit/9975905745aec0bf74ae72158288643ff72c4614))
* **plex:** add collection management tools and library browsing ([f3e9146](https://github.com/wyattjoh/media-server-mcp/commit/f3e9146a94149150d4b510ec52e4ae94e21cb294))
* **security:** add Bearer token authentication for SSE transport ([36b79d4](https://github.com/wyattjoh/media-server-mcp/commit/36b79d4d2801342c221f6d4117a1454d2b3c88df))


### Bug Fixes

* **ci:** update workflow commands and prepare for JSR publication ([528672c](https://github.com/wyattjoh/media-server-mcp/commit/528672c3236a1458dd6d64f28f46431dc2024dd7))
* improve tool parameter schemas with missing descriptions and defaults ([6c68efa](https://github.com/wyattjoh/media-server-mcp/commit/6c68efa22c678fbc115df439f5884a472182723b))


### Code Refactoring

* consolidate MCP tools in media-server-mcp package ([5107649](https://github.com/wyattjoh/media-server-mcp/commit/5107649d93244d5c4458ae1c87c5d0bd4e7ebfbd))
* migrate from server.tool to server.registerTool API ([ecd6d1f](https://github.com/wyattjoh/media-server-mcp/commit/ecd6d1fa633612563edb18d79fc9e1f1196a2758))
* remove argument parsing in favor of inline Zod schemas ([ae38ceb](https://github.com/wyattjoh/media-server-mcp/commit/ae38ceb0c79e5d6747fcf9ce700a3142793d5b0c))
* transform single package into publishable monorepo structure ([880735c](https://github.com/wyattjoh/media-server-mcp/commit/880735c28734bf58c55f0b1628c4f75377bca7d8))
