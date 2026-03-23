import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createLibraryReportPrompt(server: McpServer): void {
  server.registerPrompt(
    "library-report",
    {
      title: "Library Report",
      description: "Generate a summary of library status across all services",
    },
    () => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Generate a library report by:\n1. Get all movies from Radarr (radarr_get_movies)\n2. Get all series from Sonarr (sonarr_get_series)\n3. Summarize: total count, monitored vs unmonitored, any missing files\n4. Present a concise overview",
        },
      }],
    }),
  );
}
