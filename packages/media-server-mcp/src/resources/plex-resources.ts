import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PlexConfig } from "@wyattjoh/plex";
import * as plexClient from "@wyattjoh/plex";

export function createPlexResources(
  server: McpServer,
  config: Readonly<PlexConfig>,
): void {
  // Static resource: plex://libraries
  server.registerResource(
    "plex-libraries",
    "plex://libraries",
    {
      description: "Available Plex libraries",
      mimeType: "application/json",
    },
    async (uri) => {
      const libraries = await plexClient.getLibraries(config);

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(libraries),
          mimeType: "application/json",
        }],
      };
    },
  );

  // Templated resource: plex://collections/{collectionId}
  server.registerResource(
    "plex-collection",
    new ResourceTemplate("plex://collections/{collectionId}", {
      list: undefined,
    }),
    {
      description: "Items in a specific Plex collection",
      mimeType: "application/json",
    },
    async (uri, { collectionId }) => {
      const items = await plexClient.getCollectionItems(
        config,
        String(collectionId),
      );

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(items),
          mimeType: "application/json",
        }],
      };
    },
  );
}
