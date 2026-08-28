import type {
  CallToolResult,
  McpServer,
  ServerContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { getLogger } from "../logging.ts";

const logger = getLogger(["media-server-mcp", "tools"]);

type Extra = ServerContext;
type ZodRawShape = Record<string, z.ZodType>;

function isZodRawShape(value: unknown): value is ZodRawShape {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every((field) => field instanceof z.ZodType);
}

/**
 * Wraps an MCP server so raw tool input shapes reject unknown properties.
 *
 * The MCP SDK's raw-shape shorthand wraps shapes with `z.object()`, whose
 * default behavior strips unknown properties. A strict object preserves the
 * advertised contract at the validation boundary instead.
 *
 * @param server MCP server or compatible registration collector to wrap.
 * @returns A server proxy that strictly validates raw input shapes.
 */
export function withStrictInputSchemas(server: McpServer): McpServer {
  return new Proxy(server, {
    get(target, property, receiver) {
      if (property !== "registerTool") {
        return Reflect.get(target, property, receiver);
      }

      return (
        name: string,
        config: Record<string, unknown>,
        handler: unknown,
      ): unknown => {
        const registerTool = target.registerTool as unknown as (
          name: string,
          config: Record<string, unknown>,
          handler: unknown,
        ) => unknown;
        const inputSchema = config.inputSchema;
        const strictConfig = isZodRawShape(inputSchema)
          ? {
            ...config,
            inputSchema: z.strictObject(inputSchema, {
              error: () => "Invalid tool input",
            }),
          }
          : config;
        return registerTool.call(target, name, strictConfig, handler);
      };
    },
  }) as McpServer;
}

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
    logger.debug("Tool called: {toolName}", { toolName });
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
