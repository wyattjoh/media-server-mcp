export interface ToolCategory {
  branch: string;
  description: string;
  tools: string[];
}

export interface ToolProfile {
  name: string;
  description: string;
  branches: string[];
}

export const TOOL_BRANCHES: ToolCategory[] = [
  {
    branch: "discovery-add",
    description: "Core functionality for discovering and adding new content",
    tools: [
      // TMDB Discovery
      "tmdb_search_movies",
      "tmdb_search_tv",
      "tmdb_search_multi",
      "tmdb_get_trending",
      "tmdb_get_popular_movies",
      "tmdb_get_popular_tv",
      "tmdb_discover_movies",
      "tmdb_discover_tv",
      "tmdb_get_now_playing_movies",
      "tmdb_get_upcoming_movies",
      "tmdb_get_movie_recommendations",
      "tmdb_get_tv_recommendations",
      // Radarr/Sonarr Add
      "radarr_search_movie",
      "radarr_add_movie",
      "sonarr_search_series",
      "sonarr_add_series",
      // Plex Search
      "plex_search",
      // Configuration (needed for add operations)
      "radarr_get_configuration",
      "sonarr_get_configuration",
    ],
  },
  {
    branch: "library-management",
    description: "Managing existing content in your library",
    tools: [
      "radarr_get_movies",
      "radarr_get_movie",
      "radarr_delete_movie",
      "radarr_update_movie",
      "sonarr_get_series",
      "sonarr_get_series_by_id",
      "sonarr_delete_series",
      "sonarr_update_series",
      "sonarr_get_episodes",
      "sonarr_get_episode",
      "sonarr_update_episode_monitoring",
      // Plex Library Management
      "plex_get_libraries",
      "plex_get_metadata",
    ],
  },
  {
    branch: "system-maintenance",
    description: "System health checks and maintenance operations",
    tools: [
      "radarr_get_system_status",
      "radarr_get_health",
      "radarr_refresh_movie",
      "radarr_refresh_all_movies",
      "radarr_disk_scan",
      "sonarr_get_system_status",
      "sonarr_get_health",
      "sonarr_refresh_series",
      "sonarr_refresh_all_series",
      "sonarr_disk_scan",
      // Plex System Maintenance
      "plex_get_capabilities",
      "plex_refresh_library",
    ],
  },
  {
    branch: "download-management",
    description: "Queue and download operations",
    tools: [
      "radarr_get_queue",
      "radarr_search_movie_releases",
      "sonarr_get_queue",
      "sonarr_search_series_episodes",
      "sonarr_search_season",
      "sonarr_search_episodes",
      "sonarr_get_calendar",
    ],
  },
  {
    branch: "metadata-enrichment",
    description: "Advanced TMDB features for deep content research",
    tools: [
      "tmdb_get_movie_details",
      "tmdb_get_tv_details",
      "tmdb_get_similar_movies",
      "tmdb_get_similar_tv",
      "tmdb_search_people",
      "tmdb_get_popular_people",
      "tmdb_get_person_details",
      "tmdb_get_person_movie_credits",
      "tmdb_get_person_tv_credits",
      "tmdb_search_collections",
      "tmdb_get_collection_details",
      "tmdb_get_genres",
      "tmdb_get_certifications",
      "tmdb_get_watch_providers",
      "tmdb_get_configuration",
      "tmdb_get_countries",
      "tmdb_get_languages",
    ],
  },
  {
    branch: "advanced-search",
    description: "External ID lookups and specialized search operations",
    tools: [
      "tmdb_find_by_external_id",
      "tmdb_search_keywords",
      "tmdb_get_movies_by_keyword",
      "tmdb_get_top_rated_movies",
      "tmdb_get_top_rated_tv",
      "tmdb_get_on_the_air_tv",
      "tmdb_get_airing_today_tv",
    ],
  },
];

export const TOOL_PROFILES: ToolProfile[] = [
  {
    name: "default",
    description: "Essential discovery and add functionality (default)",
    branches: ["discovery-add"],
  },
  {
    name: "minimal",
    description: "Same as default - essential discovery and add functionality",
    branches: ["discovery-add"],
  },
  {
    name: "curator",
    description: "Discovery, add, and basic library management",
    branches: ["discovery-add", "library-management"],
  },
  {
    name: "maintainer",
    description: "Curator tools plus system maintenance",
    branches: ["discovery-add", "library-management", "system-maintenance"],
  },
  {
    name: "power-user",
    description: "All functionality except advanced search",
    branches: [
      "discovery-add",
      "library-management",
      "system-maintenance",
      "download-management",
      "metadata-enrichment",
    ],
  },
  {
    name: "full",
    description: "All available tools",
    branches: [
      "discovery-add",
      "library-management",
      "system-maintenance",
      "download-management",
      "metadata-enrichment",
      "advanced-search",
    ],
  },
];

/**
 * Get the tools that should be enabled for a given profile
 */
export function getToolsForProfile(profileName: string): string[] {
  const profile = TOOL_PROFILES.find((p) => p.name === profileName);
  if (!profile) {
    throw new Error(`Unknown tool profile: ${profileName}`);
  }

  const enabledTools = new Set<string>();
  for (const branchName of profile.branches) {
    const branch = TOOL_BRANCHES.find((b) => b.branch === branchName);
    if (branch) {
      for (const tool of branch.tools) {
        enabledTools.add(tool);
      }
    }
  }

  return Array.from(enabledTools);
}

/**
 * Get the tools that should be enabled for specific branches
 */
export function getToolsForBranches(branchNames: string[]): string[] {
  const enabledTools = new Set<string>();

  for (const branchName of branchNames) {
    const branch = TOOL_BRANCHES.find((b) => b.branch === branchName);
    if (branch) {
      for (const tool of branch.tools) {
        enabledTools.add(tool);
      }
    }
  }

  return Array.from(enabledTools);
}

/**
 * Check if a tool is enabled given the current configuration
 */
export function isToolEnabled(
  toolName: string,
  enabledTools: string[],
): boolean {
  return enabledTools.includes(toolName);
}
