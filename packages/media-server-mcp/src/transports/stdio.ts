import { type McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { getLogger } from "../logging.ts";

interface StdioServerOptions {
  createMcpServer: () => Promise<McpServer>;
}

export function createStdioServer(
  { createMcpServer }: StdioServerOptions,
): { close: () => Promise<void> } {
  const logger = getLogger(["media-server-mcp", "transport", "stdio"]);

  const server = serveStdio(createMcpServer, {
    onerror: (error) => {
      logger.error("Stdio server error", { error: error.message });
    },
  });

  logger.info("Media Server MCP Server running on stdio");

  return {
    close: async () => {
      logger.info("Closing stdio server");
      await server.close();
      logger.info("Stdio server closed");
    },
  };
}
