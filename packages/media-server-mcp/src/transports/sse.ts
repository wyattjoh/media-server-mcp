import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLogger } from "../logging.ts";
import { validateBearerToken } from "../auth.ts";
import { closeTransportServer, readBody, setCorsHeaders } from "./shared.ts";

/** Maximum number of concurrent SSE sessions to prevent resource exhaustion. */
const MAX_SESSIONS = 100;

interface SSEServerOptions {
  port: number;
  server: McpServer;
  authToken: string;
}

export function createSSEServer(
  { port, server, authToken }: SSEServerOptions,
): { close: () => Promise<void> } {
  const logger = getLogger(["media-server-mcp", "transport", "sse"]);

  logger.warn(
    "SSE transport is deprecated. Use Streamable HTTP (--http) instead. " +
      "SSE will be removed in a future release.",
  );

  // Store transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = createServer(async (req, res) => {
    try {
      setCorsHeaders(
        res,
        "GET, POST, OPTIONS",
        "Content-Type, mcp-session-id, Authorization",
        "mcp-session-id",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const pathname = url.pathname;

      // Validate Bearer token for all endpoints except health check
      if (pathname !== "/health" && !validateBearerToken(req, authToken)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "Unauthorized",
          message: "Valid Bearer token required",
        }));
        logger.warn("Unauthorized access attempt", {
          pathname,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
        return;
      }

      if (pathname === "/sse") {
        // SSE endpoint - establishes event stream connection
        if (transports.size >= MAX_SESSIONS) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Too many active sessions" }));
          logger.warn("Session limit reached ({max}), rejecting new session", {
            max: MAX_SESSIONS,
          });
          return;
        }

        // Create SSE transport — the SDK generates a secure session ID
        // via randomUUID() internally. The client discovers the session
        // endpoint from the SSE "endpoint" event the SDK emits.
        const transport = new SSEServerTransport("/messages", res);
        const sessionId = transport.sessionId;

        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("mcp-session-id", sessionId);

        transports.set(sessionId, transport);

        // Connect MCP server to this transport
        await server.connect(transport);

        // Handle cleanup when connection closes
        transport.onclose = () => {
          transports.delete(sessionId);
          logger.info("SSE session closed: {sessionId}", { sessionId });
        };

        logger.info("SSE session established: {sessionId}", { sessionId });
      } else if (pathname === "/messages") {
        // Messages endpoint - handles client-to-server messages
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
          return;
        }

        const transport = transports.get(sessionId);
        if (!transport) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Invalid or expired sessionId" }),
          );
          return;
        }

        const body = await readBody(req, res);
        if (body === undefined) {
          if (!res.headersSent) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
          return;
        }

        await transport.handlePostMessage(
          req,
          res,
          body as Record<string, unknown>,
        );
      } else if (pathname === "/health") {
        // Health check endpoint
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          activeSessions: transports.size,
          timestamp: new Date().toISOString(),
        }));
      } else {
        // 404 for all other routes
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
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

  logger.info("Starting SSE server on port {port}", { port });
  logger.info("SSE endpoint: {url}", {
    url: `http://localhost:${port}/sse?sessionId=<session-id>`,
  });
  logger.info("Messages endpoint: {url}", {
    url: `http://localhost:${port}/messages?sessionId=<session-id>`,
  });
  logger.info("Health check endpoint: {url}", {
    url: `http://localhost:${port}/health`,
  });

  httpServer.listen(port, () => {
    logger.info("SSE server listening on port {port}", { port });
  });

  return {
    close: () => closeTransportServer(transports, httpServer, logger, "SSE"),
  };
}
