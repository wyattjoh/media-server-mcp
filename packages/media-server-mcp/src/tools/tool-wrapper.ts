import type {
  CallToolResult,
  ServerContext,
} from "@modelcontextprotocol/server";
import { getLogger } from "../logging.ts";

const logger = getLogger(["media-server-mcp", "tools"]);

type Extra = ServerContext;

/**
 * Wraps a tool handler callback to centralize error handling, timing, and
 * structured logging. The returned function matches the signature expected by
 * `server.registerTool()`.
 *
 * On success, the original result is returned unchanged.
 * On failure, a `CallToolResult` with `isError: true` is returned so callers
 * always receive a well-formed response rather than an unhandled rejection.
 */
export function wrapToolHandler<Args>(
  toolName: string,
  handler: (
    args: Args,
    extra: Extra,
  ) => CallToolResult | Promise<CallToolResult>,
): (args: Args, extra: Extra) => Promise<CallToolResult> {
  return async (args: Args, extra: Extra): Promise<CallToolResult> => {
    logger.info("Tool called: {toolName}", { toolName });
    const start = Date.now();
    try {
      const result = await handler(args, extra);
      const durationMs = Date.now() - start;
      logger.debug("Tool executed successfully", { toolName, durationMs });
      return result;
    } catch (error) {
      const durationMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Tool execution failed", {
        toolName,
        durationMs,
        error: message,
      });
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${message}` }],
      };
    }
  };
}
