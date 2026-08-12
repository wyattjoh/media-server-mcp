# Changelog

## [1.2.1](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/sonarr-v1.2.0...@wyattjoh/sonarr-v1.2.1) (2026-08-12)


### Bug Fixes

* **history:** map event names to API identifiers ([33e88ed](https://github.com/wyattjoh/media-server-mcp/commit/33e88edd90497f99d1972e7a6f3154c92a53959c))
* **sonarr:** preserve queue pagination metadata ([49c65d9](https://github.com/wyattjoh/media-server-mcp/commit/49c65d95c7dd365d4c39bbe055ee94a0528b1bd6))

## [1.2.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/sonarr-v1.1.0...@wyattjoh/sonarr-v1.2.0) (2026-05-18)


### Features

* add media management tools for wanted/missing, history, releases, and queue ([da8e466](https://github.com/wyattjoh/media-server-mcp/commit/da8e466479c4d3e242b39fa1514c91602d96e976))
* **sonarr:** add history and mark-failed client functions ([11ef912](https://github.com/wyattjoh/media-server-mcp/commit/11ef912ebac5d5ffe52c6cc133b5042672322c7b))
* **sonarr:** add release search/grab, queue management, and search-all-missing client functions ([f90a09a](https://github.com/wyattjoh/media-server-mcp/commit/f90a09ab0df7a8eec7164c42f33c3645caba0f18))
* **sonarr:** add wanted/missing and cutoff unmet client functions ([e8847d9](https://github.com/wyattjoh/media-server-mcp/commit/e8847d945a5c5cba020719ade7c539c18a7c609d))

## [1.1.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/sonarr-v1.0.0...@wyattjoh/sonarr-v1.1.0) (2026-03-23)


### Features

* MCP improvements - resources, prompts, annotations, structured output, error handling ([#7](https://github.com/wyattjoh/media-server-mcp/issues/7)) ([b252f6f](https://github.com/wyattjoh/media-server-mcp/commit/b252f6f216203c53f673cce858876d60ad18c40c))

## [1.0.0](https://github.com/wyattjoh/media-server-mcp/compare/@wyattjoh/sonarr-v0.4.1...@wyattjoh/sonarr-v1.0.0) (2026-03-23)


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
