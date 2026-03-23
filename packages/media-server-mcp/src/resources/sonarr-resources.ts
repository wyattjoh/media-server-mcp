import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";

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
