# Changelog

## [1.1.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/tmdb-v1.0.0...@wyattjoh/tmdb-v1.1.0) (2026-03-23)


### Features

* MCP improvements - resources, prompts, annotations, structured output, error handling ([#7](https://github.com/wyattjoh/media-server-mcp/issues/7)) ([b252f6f](https://github.com/wyattjoh/media-server-mcp/commit/b252f6f216203c53f673cce858876d60ad18c40c))

## [1.0.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/tmdb-v0.4.1...@wyattjoh/tmdb-v1.0.0) (2026-03-23)


### ⚠ BREAKING CHANGES

* MCP tools are no longer exported from individual client packages
* Project structure completely reorganized from single package to workspace monorepo.

### Features

* add Plex media server integration ([eeb4b44](https://github.com/wyattjoh/media-server-mcp/commit/eeb4b441c8c0b83c3320474585d62edc5c7bc60d))
* add structured logging to all client packages and update docs ([94fec3d](https://github.com/wyattjoh/media-server-mcp/commit/94fec3df91ee099e42e38b4cb344e9a9c78d5f89))
* **tmdb:** enhance trending types with polymorphic type safety ([627650b](https://github.com/wyattjoh/media-server-mcp/commit/627650be29f573d76e73444ec05745854c87afe0))


### Code Refactoring

* consolidate MCP tools in media-server-mcp package ([5107649](https://github.com/wyattjoh/media-server-mcp/commit/5107649d93244d5c4458ae1c87c5d0bd4e7ebfbd))
* transform single package into publishable monorepo structure ([880735c](https://github.com/wyattjoh/media-server-mcp/commit/880735c28734bf58c55f0b1628c4f75377bca7d8))
