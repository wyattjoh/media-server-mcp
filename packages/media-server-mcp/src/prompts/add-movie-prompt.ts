import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RadarrConfig } from "@wyattjoh/radarr";
import * as radarrClient from "@wyattjoh/radarr";

export function createAddMoviePrompt(
  server: McpServer,
  config: Readonly<RadarrConfig>,
): void {
  server.registerPrompt(
    "add-movie",
    {
      title: "Add a Movie",
      description: "Guided workflow to search for and add a movie to Radarr",
    },
    async () => {
      const [qualityProfiles, rootFolders] = await Promise.all([
        radarrClient.getQualityProfiles(config),
        radarrClient.getRootFolders(config),
      ]);

      return {
        messages: [{
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `I want to add a movie to my library. Help me through these steps:\n1. Ask what movie I'm looking for\n2. Search TMDB using tmdb_search_movies\n3. Show results and let me pick\n4. Check if already in Radarr using radarr_get_movies\n5. Add using radarr_add_movie\n\nAvailable quality profiles: ${
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
