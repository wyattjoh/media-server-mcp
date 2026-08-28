import type { McpServer } from "@modelcontextprotocol/server";
import { ResourceTemplate } from "@modelcontextprotocol/server";
import type { RadarrConfig } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

/**
 * Registers Radarr configuration and movie resources on an MCP server.
 *
 * @param server MCP server that receives the resources.
 * @param config Radarr client configuration used by resource handlers.
 */
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

  // Compact static resource: config://radarr/summary
  server.registerResource(
    "radarr-config-summary",
    "config://radarr/summary",
    {
      description:
        "Compact Radarr quality profile identities and root folder status for routine decisions",
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
