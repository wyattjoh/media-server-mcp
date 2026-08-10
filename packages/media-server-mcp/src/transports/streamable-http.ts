import { createServer } from "node:http";
import { createMcpHandler, type McpServer } from "@modelcontextprotocol/server";
import {
  type NodeIncomingMessageLike,
  type NodeServerResponseLike,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import { validateBearerToken } from "../auth.ts";
import { getLogger } from "../logging.ts";
import { closeTransportServer, setCorsHeaders } from "./shared.ts";

interface StreamableHTTPServerOptions {
  port: number;
  host: string;
  createMcpServer: () => McpServer | Promise<McpServer>;
  authToken: string | undefined;
}

interface StreamableHTTPServerHandle {
  ready: Promise<void>;
  port: () => number;
  close: () => Promise<void>;
}

/**
 * Starts a dual-era Streamable HTTP server.
 *
 * The MCP SDK creates an isolated server instance for every HTTP request. This
 * keeps 2026-07-28 requests stateless while preserving the SDK's 2025-era
 * stateless compatibility path for older clients.
 */
export function createStreamableHTTPServer(
  { port, host, createMcpServer, authToken }: StreamableHTTPServerOptions,
): StreamableHTTPServerHandle {
  const logger = getLogger([
    "media-server-mcp",
    "transport",
    "streamable-http",
  ]);
  const mcpHandler = createMcpHandler(createMcpServer);
  const nodeMcpHandler = toNodeHandler(mcpHandler, {
    onerror: (error) => {
      logger.error("MCP handler failed", { error: error.message });
    },
  });

  const httpServer = createServer(async (req, res) => {
    try {
      setCorsHeaders(
        res,
        "POST, OPTIONS",
        "Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
        "",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      if (authToken && !validateBearerToken(req, authToken)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "Unauthorized",
          message: "Valid Bearer token required",
        }));
        logger.warn("Unauthorized access attempt", {
          pathname: url.pathname,
          method: req.method,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
        return;
      }

      if (url.pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      // `node:http` models optional request fields as `T | undefined`, while
      // the adapter uses optional properties. The values are passed through
      // unchanged and satisfy the adapter's runtime contract.
      await nodeMcpHandler(
        req as unknown as NodeIncomingMessageLike,
        res as NodeServerResponseLike,
      );
    } catch (error) {
      logger.error("Unhandled error in HTTP handler", {
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      } else {
        res.destroy();
      }
    }
  });

  logger.info("Starting Streamable HTTP server on {host}:{port}", {
    host,
    port,
  });
  logger.info("MCP endpoint: {url}", {
    url: `http://${host}:${port}/mcp`,
  });
  logger.info("Health check endpoint: {url}", {
    url: `http://${host}:${port}/health`,
  });
  if (authToken) {
    logger.info("Bearer token authentication enabled");
  } else {
    logger.warn("No MCP_AUTH_TOKEN set, running without authentication");
  }

  const ready = new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      logger.info("Streamable HTTP server listening on {host}:{port}", {
        host,
        port,
      });
      resolve();
    });
  });

  return {
    ready,
    port: () => {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("Streamable HTTP server is not listening");
      }
      return address.port;
    },
    close: () =>
      closeTransportServer(
        [["mcp-handler", mcpHandler]],
        httpServer,
        logger,
        "Streamable HTTP",
      ),
  };
}
