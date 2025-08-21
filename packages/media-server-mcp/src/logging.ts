import {
  configure,
  getConsoleSink,
  getLogger as getLogTapeLogger,
  getStreamSink,
} from "@logtape/logtape";

export interface LoggingOptions {
  debug: boolean;
  useStdio: boolean;
}

let isConfigured = false;

export async function configureLogging(options: LoggingOptions): Promise<void> {
  if (isConfigured) {
    return;
  }

  const logLevel = options.debug ? "debug" : "info";

  // For stdio mode, we MUST use stderr as stdout is used for MCP communication
  // For SSE mode, we can use console but still prefer stderr for consistency
  const sink = options.useStdio
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
      // LogTape meta logger (for internal LogTape messages)
      {
        category: ["logtape", "meta"],
        lowestLevel: "warning",
        sinks: ["main"],
      },
    ],
  });

  isConfigured = true;
}

export function getLogger(category: string[] = ["media-server-mcp"]) {
  return getLogTapeLogger(category);
}
