import {
  configure,
  getConsoleSink,
  getLogger as getLogTapeLogger,
  getStreamSink,
} from "@logtape/logtape";

export interface LoggingOptions {
  debug: boolean;
  useStdio: boolean;
  containerMode?: boolean;
}

let isConfigured = false;

export async function configureLogging(options: LoggingOptions): Promise<void> {
  if (isConfigured) {
    return;
  }

  const logLevel = options.debug ? "debug" : "info";
  const containerMode = options.containerMode ?? (Deno.env.get("DOCKER_CONTAINER") === "true");

  // For stdio mode, we MUST use stderr as stdout is used for MCP communication
  // For SSE mode, we can use console but still prefer stderr for consistency
  // In container mode, always use stderr for better Docker log integration
  const sink = (options.useStdio || containerMode)
    ? getStreamSink(Deno.stderr.writable)
    : getConsoleSink();

  await configure({
    sinks: {
      main: sink,
    },
    loggers: [
      // Main application logger - child loggers inherit sinks automatically
      {
        category: ["media-server-mcp"],
        lowestLevel: logLevel,
        sinks: ["main"],
      },
      // Child loggers inherit sinks from parent - just configure levels
      {
        category: ["media-server-mcp", "connection"],
        lowestLevel: logLevel,
      },
      {
        category: ["media-server-mcp", "tools"],
        lowestLevel: logLevel,
      },
      {
        category: ["media-server-mcp", "transport", "stdio"],
        lowestLevel: logLevel,
      },
      {
        category: ["media-server-mcp", "transport", "sse"],
        lowestLevel: logLevel,
      },
      // Client package loggers
      {
        category: ["radarr"],
        lowestLevel: logLevel,
        sinks: ["main"],
      },
      {
        category: ["sonarr"],
        lowestLevel: logLevel,
        sinks: ["main"],
      },
      {
        category: ["tmdb"],
        lowestLevel: logLevel,
        sinks: ["main"],
      },
      {
        category: ["plex"],
        lowestLevel: logLevel,
        sinks: ["main"],
      },
      // Docker-specific loggers
      {
        category: ["media-server-mcp", "docker"],
        lowestLevel: logLevel,
      },
      {
        category: ["media-server-mcp", "health"],
        lowestLevel: logLevel,
      },
      // LogTape meta logger (for internal LogTape messages)
      {
        category: ["logtape", "meta"],
        lowestLevel: containerMode ? "warning" : "info",
        sinks: ["main"],
      },
    ],
  });

  isConfigured = true;
}

export function getLogger(category: string[] = ["media-server-mcp"]) {
  return getLogTapeLogger(category);
}

/**
 * Helper function to detect if running in a Docker container
 */
export async function isDockerContainer(): Promise<boolean> {
  // Check for common Docker environment indicators
  if (Deno.env.get("DOCKER_CONTAINER") === "true" || 
      Deno.env.get("container") === "docker") {
    return true;
  }

  // Check if /.dockerenv exists (common Docker indicator)
  try {
    await Deno.stat("/.dockerenv");
    return true;
  } catch {
    // Continue to next check
  }

  // Check if running in a container by looking at cgroup
  try {
    const cgroup = await Deno.readTextFile("/proc/1/cgroup");
    return cgroup.includes("docker") || cgroup.includes("containerd");
  } catch {
    // Not in a container or can't read cgroup
    return false;
  }
}
