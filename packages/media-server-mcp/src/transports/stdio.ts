import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLogger } from "../logging.ts";

interface StdioServerOptions {
  server: McpServer;
}

export async function createStdioServer(
  { server }: StdioServerOptions,
): Promise<{ close: () => Promise<void> }> {
  const logger = getLogger(["media-server-mcp", "transport", "stdio"]);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Media Server MCP Server running on stdio");

  return {
    close: () => {
      logger.info("Closing stdio server");
      try {
        transport.close();
        logger.info("Stdio server closed");
      } catch (error) {
        logger.error("Error closing stdio transport", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return Promise.resolve();
    },
  };
}
