import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import * as sonarrClient from "@wyattjoh/sonarr";

export function createAddSeriesPrompt(
  server: McpServer,
  config: Readonly<SonarrConfig>,
): void {
  server.registerPrompt(
    "add-series",
    {
      title: "Add a TV Series",
      description:
        "Guided workflow to search for and add a TV series to Sonarr",
    },
    async () => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        sonarrClient.getQualityProfiles(config),
        sonarrClient.getRootFolders(config),
      ]);

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I want to add a TV series to my library. Help me through these steps:\n1. Ask what series I'm looking for\n2. Search TMDB using tmdb_search_tv\n3. Show results and let me pick\n4. Check if already in Sonarr using sonarr_get_series\n5. Add using sonarr_add_series\n\nAvailable quality profiles: ${
                JSON.stringify(
                  qualityProfiles.map((p) => ({ id: p.id, name: p.name })),
                )
              }\nAvailable root folders: ${
                JSON.stringify(
                  rootFolders.map((f) => ({ id: f.id, path: f.path })),
                )
              }`,
          },
        }],
      };
    },
  );
}
