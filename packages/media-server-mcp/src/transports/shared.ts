/**
 * Shared utilities for HTTP-based MCP transports.
 */

import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { getLogger } from "../logging.ts";

const logger = getLogger(["media-server-mcp", "transport", "shared"]);

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MiB

/**
 * Set standard CORS headers on an HTTP response.
 */
export function setCorsHeaders(
  res: ServerResponse,
  methods: string,
  allowHeaders: string,
  exposeHeaders: string,
): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", allowHeaders);
  res.setHeader("Access-Control-Expose-Headers", exposeHeaders);
}

/**
 * Read and parse the JSON body from an incoming request.
 * Enforces a maximum body size to prevent memory exhaustion.
 * Returns `undefined` if the body exceeds the limit, is invalid JSON,
 * or a read error occurs.
 */
export async function readBody(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<unknown> {
  let totalBytes = 0;
  const chunks: Buffer[] = [];

  try {
    for await (const chunk of req) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_BODY_SIZE) {
        if (!res.headersSent) {
          res.writeHead(413, {
            "Content-Type": "application/json",
            "Connection": "close",
          });
          res.end(JSON.stringify({ error: "Request body too large" }));
        }
        req.destroy();
        return undefined;
      }
      chunks.push(buf);
    }
  } catch (err) {
    logger.debug("Error reading request body", {
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch (err) {
    logger.debug("Failed to parse JSON body", {
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

/**
 * Close all transports and shut down the HTTP server.
 * Shared between SSE and Streamable HTTP transports.
 *
 * Accepts any iterable of [sessionId, closeable] entries so callers
 * don't need to build an intermediate Map.
 */
export function closeTransportServer(
  entries: Iterable<[string, { close: () => void }]>,
  httpServer: Server,
  logger: ReturnType<typeof getLogger>,
  serverName: string,
): Promise<void> {
  logger.info("Closing {serverName} server", { serverName });

  for (const [sessionId, transport] of entries) {
    try {
      transport.close();
    } catch (error) {
      logger.error(
        "Error closing transport for session {sessionId}",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  return new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) {
        logger.error("Error closing HTTP server", {
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      } else {
        logger.info("{serverName} server closed", { serverName });
        resolve();
      }
    });
  });
}
