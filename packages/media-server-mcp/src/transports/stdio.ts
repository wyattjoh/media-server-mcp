import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

interface StdioServerOptions {
  server: McpServer;
}

export async function createStdioServer(
  { server }: StdioServerOptions,
): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[INFO] Media Server MCP Server running on stdio");
}
