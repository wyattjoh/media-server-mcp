import { getLogger } from "../logging.ts";

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const EXECUTION_TIMEOUT_MS = 1_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const logger = getLogger(["media-server-mcp", "tools", "codemode"]);

type RunnerResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: { value: unknown; diagnostics: string[] };
  error?: { code: number; message: string };
};

function encodeFrame(value: unknown): Uint8Array {
  const body = encoder.encode(JSON.stringify(value));
  if (body.length > MAX_REQUEST_BYTES) {
    throw new Error("Code Mode request exceeds byte limit");
  }
  const frame = new Uint8Array(4 + body.length);
  new DataView(frame.buffer).setUint32(0, body.length, false);
  frame.set(body, 4);
  return frame;
}

function decodeFrame(bytes: Uint8Array): RunnerResponse {
  if (bytes.length < 4) throw new Error("Code Mode runner protocol error");
  const length = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0, false);
  if (
    length === 0 || length > MAX_RESPONSE_BYTES || bytes.length !== length + 4
  ) {
    throw new Error("Code Mode runner protocol error");
  }
  try {
    return JSON.parse(decoder.decode(bytes.subarray(4))) as RunnerResponse;
  } catch {
    throw new Error("Code Mode runner protocol error");
  }
}

/**
 * Executes a bounded JavaScript async-function body in a fresh restricted Deno
 * subprocess and returns its explicit JSON value.
 *
 * @param source JavaScript source interpreted as an async-function body.
 * @param input Optional JSON input supplied to the function body.
 * @returns The explicit JSON-compatible value returned by the function body.
 */
export async function executeCodeMode(
  source: string,
  input: unknown,
): Promise<unknown> {
  if (encoder.encode(source).length > MAX_SOURCE_BYTES) {
    throw new Error("Code Mode source exceeds byte limit");
  }

  const request = encodeFrame({
    jsonrpc: "2.0",
    id: 1,
    method: "execute",
    params: { source, input },
  });
  const runnerUrl = new URL("./codemode-runner.ts", import.meta.url);
  const child = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--quiet",
      "--no-prompt",
      "--cached-only",
      "--frozen",
      "--no-config",
      "--no-lock",
      "--deny-read",
      "--deny-write",
      "--deny-net",
      "--deny-env",
      "--deny-run",
      "--deny-ffi",
      runnerUrl.href,
    ],
    clearEnv: true,
    env: {},
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const stdin = child.stdin.getWriter();
  await stdin.write(request);
  await stdin.close();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timeoutId = setTimeout(() => resolve("timeout"), EXECUTION_TIMEOUT_MS);
  });
  const outputPromise = child.output();
  const completed = await Promise.race([
    outputPromise.then((output) => ({ kind: "output" as const, output })),
    timeout.then(() => ({ kind: "timeout" as const })),
  ]);

  if (completed.kind === "timeout") {
    try {
      child.kill("SIGKILL");
    } catch {
      // The process exited between the timeout and kill attempt.
    }
    await outputPromise;
    throw new Error("Code Mode execution timed out");
  }
  if (timeoutId !== undefined) clearTimeout(timeoutId);

  const stderr = decoder.decode(completed.output.stderr).trim();
  if (stderr) logger.debug("Code Mode runner diagnostics", { stderr });
  if (!completed.output.success) {
    throw new Error("Code Mode runner failed");
  }

  const response = decodeFrame(completed.output.stdout);
  if (response.jsonrpc !== "2.0" || response.id !== 1) {
    throw new Error("Code Mode runner protocol error");
  }
  if (response.error) throw new Error(response.error.message);
  if (!response.result) throw new Error("Code Mode runner protocol error");
  if (response.result.diagnostics.length > 0) {
    logger.debug("Code Mode execution console output", {
      diagnostics: response.result.diagnostics,
    });
  }
  return response.result.value;
}
