# Changelog

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
