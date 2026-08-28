import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";

/**
 * Registers Sonarr configuration and series resources on an MCP server.
 *
 * @param server MCP server that receives the resources.
 * @param config Sonarr client configuration used by resource handlers.
 */
export function createSonarrResources(
  server: McpServer,
  config: Readonly<SonarrConfig>,
): void {
  // Static resource: config://sonarr
  server.registerResource(
    "sonarr-config",
    "config://sonarr",
    {
      description:
        "Sonarr configuration including quality profiles and root folders",
      mimeType: "application/json",
    },
    async (uri) => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        sonarrClient.getQualityProfiles(config),
        sonarrClient.getRootFolders(config),
      ]);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ qualityProfiles, rootFolders }),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Compact static resource: config://sonarr/summary
  server.registerResource(
    "sonarr-config-summary",
    "config://sonarr/summary",
    {
      description:
        "Compact Sonarr quality profile identities and root folder status for routine decisions",
      mimeType: "application/json",
    },
    async (uri) => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        sonarrClient.getQualityProfiles(config),
        sonarrClient.getRootFolders(config),
      ]);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({
            qualityProfiles: qualityProfiles.map(({ id, name }) => ({
              id,
              name,
            })),
            rootFolders: rootFolders.map(({
              id,
              path,
              accessible,
              freeSpace,
            }) => ({ id, path, accessible, freeSpace })),
          }),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Templated resource: sonarr://series/{seriesId}
  server.registerResource(
    "sonarr-series",
    new ResourceTemplate("sonarr://series/{seriesId}", { list: undefined }),
    {
      description: "Details for a specific series in Sonarr",
      mimeType: "application/json",
    },
    async (uri, { seriesId }) => {
      const series = await sonarrClient.getSeriesById(
        config,
        Number(seriesId),
      );

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(series),
          mimeType: "application/json",
        }],
      };
    },
  );
}
