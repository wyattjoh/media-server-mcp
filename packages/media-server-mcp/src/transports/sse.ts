import { createServer } from "node:http";
import { URL } from "node:url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLogger } from "../logging.ts";
import type { HealthService } from "../docker/health-service.ts";
import type { RadarrConfig } from "@wyattjoh/radarr";
import type { SonarrConfig } from "@wyattjoh/sonarr";
import type { TMDBConfig } from "@wyattjoh/tmdb";
import type { PlexConfig } from "@wyattjoh/plex";
import deno from "../../deno.json" with { type: "json" };

interface SSEServerOptions {
  port: number;
  server: McpServer;
  authToken: string;
  healthService: HealthService;
}

function validateBearerToken(
  req: { headers: { authorization?: string | string[] | undefined } },
  expectedToken: string,
): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return false;
  }

  // Handle case where authorization header could be an array
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue) {
    return false;
  }
  const token = headerValue.replace(/^Bearer\s+/, "");
  return token === expectedToken;
}

export function createSSEServer(
  { port, server, authToken, healthService }: SSEServerOptions,
): { close: () => Promise<void> } {
  const logger = getLogger(["media-server-mcp", "transport", "sse"]);

  // Store transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  const httpServer = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, mcp-session-id, Authorization",
    );
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const pathname = url.pathname;
    const sessionId = url.searchParams.get("sessionId");

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
      if (!sessionId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
        return;
      }

      try {
        // Set SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("mcp-session-id", sessionId);

        // Create SSE transport for this session
        const transport = new SSEServerTransport("/messages", res);
        transports.set(sessionId, transport);

        // Connect MCP server to this transport
        await server.connect(transport);

        // Handle cleanup when connection closes
        transport.onclose = () => {
          transports.delete(sessionId);
          logger.info("SSE session closed: {sessionId}", { sessionId });
        };

        logger.info("SSE session established: {sessionId}", { sessionId });
      } catch (error) {
        logger.error("Failed to establish SSE connection", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Failed to establish SSE connection" }),
        );
      }
    } else if (pathname === "/messages") {
      // Messages endpoint - handles client-to-server messages
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      if (!sessionId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
        return;
      }

      const transport = transports.get(sessionId);
      if (!transport) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid or expired sessionId" }));
        return;
      }

      try {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const jsonBody = JSON.parse(body);

            // Handle the message through the SSE transport
            await transport.handlePostMessage(req, res, jsonBody);
          } catch (parseError) {
            logger.error("Failed to parse JSON", {
              sessionId,
              error: parseError instanceof Error
                ? parseError.message
                : String(parseError),
            });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      } catch (error) {
        logger.error("Failed to handle message", {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to process message" }));
      }
    } else if (pathname === "/health") {
      // Health check endpoint - Docker API contract
      try {
        const healthStatus = await healthService.getHealthStatus();
        const statusCode = healthStatus.serverStatus === "healthy" ? 200 : 503;
        
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify(healthStatus));
      } catch (error) {
        logger.error("Health check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          serverStatus: "unhealthy",
          serviceConnections: [],
          lastCheck: new Date().toISOString(),
          uptime: "PT0S",
          version: deno.version,
          transportMode: "sse",
        }));
      }
    } else if (pathname === "/status") {
      // Status endpoint - Docker API contract
      try {
        const containerStatus = {
          containerId: Deno.env.get("HOSTNAME") || "unknown",
          status: "running" as const,
          image: `media-server-mcp:${deno.version}`,
          ports: [
            {
              containerPort: port,
              hostPort: port,
              protocol: "tcp" as const,
            },
          ],
          volumes: [
            {
              name: "media-server-mcp-logs",
              mountPath: "/app/logs",
              type: "logs" as const,
            },
            {
              name: "media-server-mcp-config",
              mountPath: "/app/config",
              type: "config" as const,
            },
          ],
          environment: Object.entries(Deno.env.toObject())
            .filter(([key]) => key.startsWith("RADARR_") || key.startsWith("SONARR_") || 
                    key.startsWith("TMDB_") || key.startsWith("PLEX_") || 
                    key.startsWith("MCP_") || key.startsWith("TOOL_") || 
                    key.startsWith("DEBUG_"))
            .map(([name, value]) => ({
              name,
              value: value || "",
              sensitive: name.includes("API_KEY") || name.includes("TOKEN"),
            })),
          healthStatus: (await healthService.getHealthStatus()).serverStatus,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(containerStatus));
      } catch (error) {
        logger.error("Status check failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to get container status" }));
      }
    } else {
      // 404 for all other routes
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
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
    close: () => {
      logger.info("Closing SSE server");

      // Close all active transports
      for (const [sessionId, transport] of transports) {
        try {
          transport.close();
        } catch (error) {
          logger.error("Error closing transport for session {sessionId}", {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      transports.clear();

      // Close HTTP server
      return new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            logger.error("Error closing HTTP server", {
              error: error instanceof Error ? error.message : String(error),
            });
            reject(error);
          } else {
            logger.info("SSE server closed");
            resolve();
          }
        });
      });
    },
  };
}
