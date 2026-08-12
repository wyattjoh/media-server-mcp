# Changelog

## [1.2.1](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/radarr-v1.2.0...@wyattjoh/radarr-v1.2.1) (2026-08-12)


### Bug Fixes

* **history:** map event names to API identifiers ([33e88ed](https://github.com/wyattjoh/media-server-mcp/commit/33e88edd90497f99d1972e7a6f3154c92a53959c))

## [1.2.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/radarr-v1.1.0...@wyattjoh/radarr-v1.2.0) (2026-05-18)


### Features

* add media management tools for wanted/missing, history, releases, and queue ([da8e466](https://github.com/wyattjoh/media-server-mcp/commit/da8e466479c4d3e242b39fa1514c91602d96e976))
* **radarr:** add history and mark-failed client functions ([a2872d8](https://github.com/wyattjoh/media-server-mcp/commit/a2872d8d86b89dfe3be87f2a1a41d4acedfe835b))
* **radarr:** add release search/grab, calendar, queue management, and search-all-missing client functions ([405ac9c](https://github.com/wyattjoh/media-server-mcp/commit/405ac9c1a5d81d97a030f0cf7bca373b54c69326))
* **radarr:** add wanted/missing and cutoff unmet client functions ([b02f2fd](https://github.com/wyattjoh/media-server-mcp/commit/b02f2fd7d7af4e08a034bc2cc02124f0308b2557))

## [1.1.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/radarr-v1.0.0...@wyattjoh/radarr-v1.1.0) (2026-03-23)


### Features

* MCP improvements - resources, prompts, annotations, structured output, error handling ([#7](https://github.com/wyattjoh/media-server-mcp/issues/7)) ([b252f6f](https://github.com/wyattjoh/media-server-mcp/commit/b252f6f216203c53f673cce858876d60ad18c40c))

## [1.0.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/radarr-v0.4.1...@wyattjoh/radarr-v1.0.0) (2026-03-23)


### ⚠ BREAKING CHANGES

* MCP tools are no longer exported from individual client packages
* Project structure completely reorganized from single package to workspace monorepo.

### Features

* add Plex media server integration ([eeb4b44](https://github.com/wyattjoh/media-server-mcp/commit/eeb4b441c8c0b83c3320474585d62edc5c7bc60d))
* add polymorphic ID lookup for Radarr and Sonarr clients ([3e925b8](https://github.com/wyattjoh/media-server-mcp/commit/3e925b8f304d45b7dcb08d0c7321a22775ec8f2e))
* add structured logging to all client packages and update docs ([94fec3d](https://github.com/wyattjoh/media-server-mcp/commit/94fec3df91ee099e42e38b4cb344e9a9c78d5f89))


### Code Refactoring

* consolidate MCP tools in media-server-mcp package ([5107649](https://github.com/wyattjoh/media-server-mcp/commit/5107649d93244d5c4458ae1c87c5d0bd4e7ebfbd))
* transform single package into publishable monorepo structure ([880735c](https://github.com/wyattjoh/media-server-mcp/commit/880735c28734bf58c55f0b1628c4f75377bca7d8))
