import { assertEquals, assertExists } from "@std/assert";
import { createServer as createNodeServer } from "node:http";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { getLogger } from "../src/logging.ts";
import { closeTransportServer } from "../src/transports/shared.ts";
import { createStreamableHTTPServer } from "../src/transports/streamable-http.ts";

Deno.test("Shared transport module can be imported", async () => {
  const mod = await import("../src/transports/shared.ts");
  assertEquals(typeof mod.readBody, "function");
  assertEquals(typeof mod.setCorsHeaders, "function");
  assertEquals(typeof mod.closeTransportServer, "function");
});

Deno.test("MCP handler serves a complete 2026-07-28 discovery result", async () => {
  const handler = createMcpHandler(
    () =>
      new McpServer(
        { name: "test-server", version: "1.0.0" },
        { capabilities: { tools: {} } },
      ),
  );

  const response = await handler.fetch(modernRequest("server/discover"));
  const body = await response.json() as {
    result: {
      resultType: string;
      supportedVersions: string[];
      ttlMs: number;
      cacheScope: string;
      _meta: Record<string, unknown>;
    };
  };

  assertEquals(response.status, 200);
  assertEquals(body.result.resultType, "complete");
  assertEquals(body.result.supportedVersions.includes("2026-07-28"), true);
  assertEquals(typeof body.result.ttlMs, "number");
  assertEquals(body.result.cacheScope, "private");
  assertExists(body.result._meta["io.modelcontextprotocol/serverInfo"]);

  await handler.close();
});

Deno.test("MCP handler preserves the 2025-era compatibility path", async () => {
  const handler = createMcpHandler(
    () => new McpServer({ name: "test-server", version: "1.0.0" }),
  );
  const response = await handler.fetch(
    new Request("http://test.local/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "legacy-request-1",
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy-client", version: "1.0.0" },
        },
      }),
    }),
  );
  const sseMessage = await response.text();
  const data = sseMessage.split("\n").find((line) => line.startsWith("data: "));
  assertExists(data);
  const body = JSON.parse(data.slice("data: ".length)) as {
    result: { protocolVersion: string };
  };

  assertEquals(response.status, 200);
  assertEquals(body.result.protocolVersion, "2025-11-25");

  await handler.close();
});

Deno.test("HTTP server routes modern requests through the Node adapter", async () => {
  let factoryCalls = 0;
  const server = createStreamableHTTPServer({
    port: 0,
    host: "127.0.0.1",
    createMcpServer: () => {
      factoryCalls += 1;
      return new McpServer(
        { name: "test-server", version: "1.0.0" },
        { capabilities: { tools: {} } },
      );
    },
    authToken: undefined,
    allowedOriginHostnames: ["localhost", "127.0.0.1", "[::1]"],
  });

  await server.ready;
  try {
    const response = await fetch(
      modernRequest(
        "server/discover",
        {},
        `http://127.0.0.1:${server.port()}/mcp`,
      ),
    );
    const body = await response.json() as {
      result: { resultType: string };
    };

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("access-control-allow-methods"),
      "POST, OPTIONS",
    );
    assertEquals(
      response.headers.get("access-control-expose-headers"),
      null,
    );
    assertEquals(body.result.resultType, "complete");
    assertEquals(factoryCalls, 1);
  } finally {
    await server.close();
  }
});

Deno.test("HTTP server rejects oversized and malformed MCP request bodies", async () => {
  const server = createTestServer();
  await server.ready;
  try {
    const baseUrl = `http://127.0.0.1:${server.port()}/mcp`;
    const oversized = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "x".repeat(1024 * 1024 + 1),
    });
    assertEquals(oversized.status, 413);

    const malformed = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assertEquals(malformed.status, 400);
  } finally {
    await server.close();
  }
});

Deno.test("HTTP server rejects unexpected origins and permits allowed or absent origins", async () => {
  let factoryCalls = 0;
  const server = createTestServer(() => {
    factoryCalls += 1;
  });
  await server.ready;
  try {
    const url = `http://127.0.0.1:${server.port()}/mcp`;
    const rejected = await fetch(modernRequest("server/discover", {
      Origin: "https://untrusted.example",
    }, url));
    assertEquals(rejected.status, 403);
    assertEquals(factoryCalls, 0);

    const allowed = await fetch(modernRequest("server/discover", {
      Origin: "http://localhost:5173",
    }, url));
    assertEquals(allowed.status, 200);

    const absent = await fetch(modernRequest("server/discover", {}, url));
    assertEquals(absent.status, 200);
    assertEquals(factoryCalls, 2);
  } finally {
    await server.close();
  }
});

Deno.test("HTTP server rejects unsupported MCP methods without reading a body", async () => {
  const server = createTestServer();
  await server.ready;
  try {
    const url = `http://127.0.0.1:${server.port()}/mcp`;
    for (const method of ["GET", "DELETE", "PUT"]) {
      const response = await fetch(url, {
        method,
        ...(method === "GET" ? {} : { body: "x".repeat(1024 * 1024 + 1) }),
      });
      assertEquals(response.status, 405);
    }
  } finally {
    await server.close();
  }
});

Deno.test("transport shutdown awaits closeables and continues after rejection", async () => {
  const httpServer = createNodeServer();
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));

  const teardown = Promise.withResolvers<void>();
  let finalCloseCalled = false;
  let shutdownSettled = false;
  const shutdown = closeTransportServer(
    [
      ["async", { close: () => teardown.promise }],
      ["rejecting", { close: () => Promise.reject(new Error("boom")) }],
      ["final", {
        close: () => {
          finalCloseCalled = true;
        },
      }],
    ],
    httpServer,
    getLogger(["media-server-mcp", "test"]),
    "test",
  ).then(() => {
    shutdownSettled = true;
  });

  await Promise.resolve();
  assertEquals(shutdownSettled, false);
  teardown.resolve();
  await shutdown;
  assertEquals(finalCloseCalled, true);
  assertEquals(shutdownSettled, true);
});

Deno.test("MCP handler rejects a mismatched modern method header", async () => {
  const handler = createMcpHandler(
    () => new McpServer({ name: "test-server", version: "1.0.0" }),
  );
  const response = await handler.fetch(
    modernRequest("server/discover", { "Mcp-Method": "tools/list" }),
  );
  const body = await response.json() as { error: { code: number } };

  assertEquals(response.status, 400);
  assertEquals(body.error.code, -32020);

  await handler.close();
});

function createTestServer(onCreate: () => void = () => {}) {
  return createStreamableHTTPServer({
    port: 0,
    host: "127.0.0.1",
    createMcpServer: () => {
      onCreate();
      return new McpServer(
        { name: "test-server", version: "1.0.0" },
        { capabilities: { tools: {} } },
      );
    },
    authToken: undefined,
    allowedOriginHostnames: ["localhost", "127.0.0.1", "[::1]"],
  });
}

function modernRequest(
  method: string,
  headers: HeadersInit = {},
  url = "http://test.local/mcp",
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2026-07-28",
      "Mcp-Method": method,
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "request-1",
      method: "server/discover",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientCapabilities": {},
          "io.modelcontextprotocol/clientInfo": {
            name: "test-client",
            version: "1.0.0",
          },
        },
      },
    }),
  });
}
