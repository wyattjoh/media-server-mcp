import { assert, assertEquals } from "@std/assert";
import { createPlexConfig, testConnection } from "../mod.ts";

Deno.test(
  "makeRequest - passes AbortSignal to fetch",
  async () => {
    const config = createPlexConfig("http://localhost:32400", "test-token");
    let capturedSignal: AbortSignal | undefined;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (
      _input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedSignal = init?.signal ?? undefined;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            MediaContainer: { version: "1.43.0", machineIdentifier: "abc123" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    };

    try {
      await testConnection(config);
      assert(capturedSignal !== undefined, "signal should be passed to fetch");
      assert(
        capturedSignal instanceof AbortSignal,
        "signal should be an AbortSignal",
      );
      assert(
        !capturedSignal.aborted,
        "signal should not be aborted for a fresh request",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test(
  "makeRequest - surfaces timeout errors as failure",
  async () => {
    const config = createPlexConfig("http://localhost:32400", "test-token");

    const originalFetch = globalThis.fetch;
    // Simulate a timeout by throwing a DOMException with name "TimeoutError",
    // which is what AbortSignal.timeout() causes when the deadline is exceeded.
    globalThis.fetch = (): Promise<Response> => {
      return Promise.reject(
        new DOMException(
          "The operation was aborted due to timeout",
          "TimeoutError",
        ),
      );
    };

    try {
      const result = await testConnection(config);
      assertEquals(result.success, false);
      assert(typeof result.error === "string");
      assert(result.error.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);
