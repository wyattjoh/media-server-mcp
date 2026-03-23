import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLogger } from "../logging.ts";
import { validateBearerToken } from "../auth.ts";
import { closeTransportServer, readBody, setCorsHeaders } from "./shared.ts";

/** Default idle timeout for sessions: 30 minutes. */
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Maximum number of concurrent sessions to prevent resource exhaustion. */
const MAX_SESSIONS = 100;

interface StreamableHTTPServerOptions {
  port: number;
  host: string;
  createMcpServer: () => Promise<McpServer>;
  authToken: string | undefined;
}

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

export function createStreamableHTTPServer(
  { port, host, createMcpServer, authToken }: StreamableHTTPServerOptions,
): { close: () => Promise<void> } {
  const logger = getLogger([
    "media-server-mcp",
    "transport",
    "streamable-http",
  ]);

  const sessions = new Map<string, SessionEntry>();

  const httpServer = createServer(async (req, res) => {
    try {
      setCorsHeaders(
        res,
        "GET, POST, DELETE, OPTIONS",
        "Content-Type, Accept, Authorization, Mcp-Session-Id",
        "Mcp-Session-Id",
      );

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const pathname = url.pathname;

      // Health check endpoint — no auth required
      if (pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          activeSessions: sessions.size,
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // Validate Bearer token when configured
      if (authToken && !validateBearerToken(req, authToken)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          error: "Unauthorized",
          message: "Valid Bearer token required",
        }));
        logger.warn("Unauthorized access attempt", {
          pathname,
          method: req.method,
          ip: req.socket.remoteAddress,
          userAgent: req.headers["user-agent"],
        });
        return;
      }

      // All MCP traffic goes through /mcp
      if (pathname !== "/mcp") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      if (req.method === "POST") {
        await handlePost(req, res, createMcpServer, sessions, logger);
        return;
      }

      // GET and DELETE operate on existing sessions
      const entry = getSessionEntry(req, res, sessions);
      if (!entry) return;

      entry.lastActivity = Date.now();
      await entry.transport.handleRequest(req, res);
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

  // Session idle reaper — runs every 60 seconds
  const reaper = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, entry] of sessions) {
      if (now - entry.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
        logger.info("Reaping idle session: {sessionId}", { sessionId });
        try {
          entry.transport.close();
        } catch {
          // already closed
        }
        sessions.delete(sessionId);
      }
    }
  }, 60_000);

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
    logger.warn(
      "No MCP_AUTH_TOKEN set — running without authentication",
    );
  }

  httpServer.listen(port, host, () => {
    logger.info("Streamable HTTP server listening on {host}:{port}", {
      host,
      port,
    });
  });

  return {
    close: () => {
      clearInterval(reaper);

      const entries = Array.from(
        sessions,
        ([id, e]) => [id, e.transport] as [string, { close: () => void }],
      );
      sessions.clear();

      return closeTransportServer(
        entries,
        httpServer,
        logger,
        "Streamable HTTP",
      );
    },
  };
}

/**
 * Look up a session entry by Mcp-Session-Id header.
 * Sends an error response and returns undefined if not found.
 */
function getSessionEntry(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: Map<string, SessionEntry>,
): SessionEntry | undefined {
  const sessionId = req.headers["mcp-session-id"];
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;

  if (!sid) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Missing Mcp-Session-Id header" }),
    );
    return undefined;
  }

  const entry = sessions.get(sid);
  if (!entry) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Invalid or expired session" }),
    );
    return undefined;
  }

  return entry;
}

/**
 * Handle POST requests to /mcp.
 *
 * If the body is an Initialize request, create a new McpServer and
 * session transport. Otherwise, route to the existing session.
 */
async function handlePost(
  req: IncomingMessage,
  res: ServerResponse,
  createMcpServer: () => Promise<McpServer>,
  sessions: Map<string, SessionEntry>,
  logger: ReturnType<typeof getLogger>,
): Promise<void> {
  const body = await readBody(req, res);
  if (body === undefined) {
    // readBody already sent 413 if body was too large
    if (!res.headersSent) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  if (isInitializeRequest(body)) {
    if (sessions.size >= MAX_SESSIONS) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many active sessions" }));
      logger.warn("Session limit reached ({max}), rejecting new session", {
        max: MAX_SESSIONS,
      });
      return;
    }

    // Create a fresh McpServer for this session so each session
    // has its own independent server instance with registered tools
    const mcpServer = await createMcpServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        sessions.delete(sid);
        logger.info("Session closed: {sessionId}", {
          sessionId: sid,
        });
      }
    };

    // The SDK's StreamableHTTPServerTransport implements Transport,
    // but type resolution across npm package boundaries in Deno can
    // produce a structural mismatch. This cast is safe.
    await mcpServer.connect(transport as unknown as Transport);

    await transport.handleRequest(req, res, body);

    // The transport's sessionId is only assigned during handleRequest
    // (when the SDK processes the initialize request), so we must read
    // it *after* handleRequest completes.
    const sessionId = transport.sessionId;
    if (sessionId) {
      sessions.set(sessionId, { transport, lastActivity: Date.now() });
      logger.info("Session created: {sessionId}", { sessionId });
    }
  } else {
    // Route to existing session
    const entry = getSessionEntry(req, res, sessions);
    if (!entry) return;

    entry.lastActivity = Date.now();
    await entry.transport.handleRequest(req, res, body);
  }
}
