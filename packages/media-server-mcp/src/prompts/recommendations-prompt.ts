import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createRecommendationsPrompt(server: McpServer): void {
  server.registerPrompt(
    "recommendations",
    {
      title: "Content Recommendations",
      description:
        "Get personalized movie and TV show recommendations based on your library",
    },
    () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Help me find content recommendations based on my library:\n1. Get my current movies from Radarr (radarr_get_movies) and series from Sonarr (sonarr_get_series)\n2. Pick a few titles I have and use tmdb_get_movie_recommendations or tmdb_get_tv_recommendations\n3. Filter out anything I already own\n4. Present a curated list of recommendations with titles, overviews, and ratings",
        },
      }],
    }),
  );
}
