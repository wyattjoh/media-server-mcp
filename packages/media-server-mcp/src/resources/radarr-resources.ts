import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RadarrConfig } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

export function createRadarrResources(
  server: McpServer,
  config: Readonly<RadarrConfig>,
): void {
  // Static resource: config://radarr
  server.registerResource(
    "radarr-config",
    "config://radarr",
    {
      description:
        "Radarr configuration including quality profiles and root folders",
      mimeType: "application/json",
    },
    async (uri) => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        radarrClient.getQualityProfiles(config),
        radarrClient.getRootFolders(config),
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

  // Templated resource: radarr://movies/{movieId}
  server.registerResource(
    "radarr-movie",
    new ResourceTemplate("radarr://movies/{movieId}", { list: undefined }),
    {
      description: "Details for a specific movie in Radarr",
      mimeType: "application/json",
    },
    async (uri, { movieId }) => {
      const movie = await radarrClient.getMovie(
        config,
        Number(movieId),
      );

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(movie),
          mimeType: "application/json",
        }],
      };
    },
  );
}
