import { getLogger } from "../logging.ts";

/**
 * Fixed server-owned resource limits for Code Mode executions.
 */
export const CODEMODE_LIMITS = {
  sourceBytes: 64 * 1024,
  inputBytes: 64 * 1024,
  frameBytes: 256 * 1024,
  toolCalls: 20,
  concurrentToolCalls: 4,
  requestBytes: 192 * 1024,
  toolResultBytes: 128 * 1024,
  totalToolResultBytes: 512 * 1024,
  logBytes: 8 * 1024,
  finalResultBytes: 128 * 1024,
  executionTimeoutMs: 1_000,
  concurrentExecutions: 4,
} as const;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const logger = getLogger(["media-server-mcp", "tools", "codemode"]);

/**
 * A native tool authorized for one Code Mode execution.
 */
export type CodeModeSelectedTool = {
  name: string;
  facadePath: string;
};

type RunnerMessage = {
  jsonrpc: "2.0";
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: { value: unknown; diagnostics: string[] };
  error?: { code: number; message: string };
};

const PROTOCOL_ERROR = "Code Mode runner protocol error";
const CODEMODE_RUNNER_URL = new URL("./codemode-runner.ts", import.meta.url);

/**
 * Returns the fixed trusted-runner launch contract used by Code Mode.
 *
 * @returns A direct Deno executable and argument array with an empty environment.
 */
export function getCodeModeRunnerLaunch(): {
  executable: string;
  args: string[];
  clearEnv: true;
  env: Record<string, string>;
} {
  return {
    executable: Deno.execPath(),
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
      CODEMODE_RUNNER_URL.href,
    ],
    clearEnv: true,
    env: {},
  };
}

function protocolError(): Error {
  return new Error(PROTOCOL_ERROR);
}

function runnerError(message: string): Error {
  const stable = new Set([
    "JavaScript syntax error",
    "JavaScript execution failed",
    "Result exceeds depth limit",
    "Result is not valid JSON",
    "Result contains a cycle",
    "Result exceeds byte limit",
  ]);
  return new Error(stable.has(message) ? message : PROTOCOL_ERROR);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolCall(value: unknown): value is RunnerMessage {
  if (!isRecord(value) || value.jsonrpc !== "2.0") return false;
  if (!Number.isSafeInteger(value.id) || (value.id as number) < 2) return false;
  if (value.method !== "tool.call" || !isRecord(value.params)) return false;
  if (typeof value.params.facadePath !== "string") return false;
  return Object.keys(value).every((key) =>
    ["jsonrpc", "id", "method", "params"].includes(key)
  );
}

function isTerminal(value: unknown): value is RunnerMessage {
  if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== 1) {
    return false;
  }
  if ("method" in value || "params" in value) return false;
  const hasResult = "result" in value;
  const hasError = "error" in value;
  if (hasResult === hasError) return false;
  if (hasError) {
    return isRecord(value.error) && Number.isInteger(value.error.code) &&
      typeof value.error.message === "string";
  }
  if (!isRecord(value.result) || !Array.isArray(value.result.diagnostics)) {
    return false;
  }
  return value.result.diagnostics.every((item) => typeof item === "string") &&
    "value" in value.result;
}

type Execution = { child: Deno.ChildProcess; terminate: () => Promise<void> };

type BoundedStreamResult = {
  text: string;
  truncated: boolean;
};

let runningExecutions = 0;
const executionWaiters: (() => void)[] = [];
const activeExecutions = new Set<Execution>();

function bytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

function limitError(name: string): Error {
  return new Error(`Code Mode ${name} exceeds limit`);
}

/**
 * Drains a byte stream while retaining only a bounded diagnostic prefix.
 *
 * @param stream Stream to drain until it closes.
 * @param limit Maximum diagnostic bytes to retain.
 * @returns The retained UTF-8 prefix and whether additional bytes were discarded.
 */
export async function drainBoundedStream(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<BoundedStreamResult> {
  const reader = stream.getReader();
  const retained = new Uint8Array(limit);
  let retainedBytes = 0;
  let truncated = false;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    const available = limit - retainedBytes;
    const copied = Math.min(available, chunk.value.length);
    if (copied > 0) {
      retained.set(chunk.value.subarray(0, copied), retainedBytes);
      retainedBytes += copied;
    }
    if (copied < chunk.value.length) truncated = true;
  }
  return {
    text: new TextDecoder().decode(retained.subarray(0, retainedBytes)),
    truncated,
  };
}

async function acquireExecution(): Promise<() => void> {
  if (runningExecutions >= CODEMODE_LIMITS.concurrentExecutions) {
    await new Promise<void>((resolve) => executionWaiters.push(resolve));
  }
  runningExecutions++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    runningExecutions--;
    executionWaiters.shift()?.();
  };
}

async function withSemaphore<T>(
  acquire: () => Promise<() => void>,
  action: () => Promise<T>,
): Promise<T> {
  const release = await acquire();
  try {
    return await action();
  } finally {
    release();
  }
}

function createSemaphore(limit: number): () => Promise<() => void> {
  let running = 0;
  const waiters: (() => void)[] = [];
  return async () => {
    if (running >= limit) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    running++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      running--;
      waiters.shift()?.();
    };
  };
}

/**
 * Encodes one bounded Code Mode protocol value for transport.
 *
 * @param value JSON value to frame.
 * @returns A four-byte big-endian length prefix followed by UTF-8 JSON.
 */
export function encodeCodeModeFrame(value: unknown): Uint8Array {
  const body = encoder.encode(JSON.stringify(value));
  if (body.length === 0 || body.length > CODEMODE_LIMITS.frameBytes) {
    throw limitError("frame bytes");
  }
  const frame = new Uint8Array(4 + body.length);
  new DataView(frame.buffer).setUint32(0, body.length, false);
  frame.set(body, 4);
  return frame;
}

/**
 * Creates a fail-closed reader for length-prefixed Code Mode protocol values.
 *
 * @param reader Byte stream reader owned by one child execution.
 * @returns Operations for reading frames and asserting clean stream termination.
 */
export function createCodeModeFrameReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): {
  read: () => Promise<unknown>;
  assertEnd: () => Promise<void>;
} {
  let buffered = new Uint8Array();
  let corrupted = false;
  const fail = (): never => {
    corrupted = true;
    throw protocolError();
  };
  const take = async (length: number): Promise<Uint8Array> => {
    if (corrupted) return fail();
    while (buffered.length < length) {
      const chunk = await reader.read();
      if (chunk.done || !chunk.value || chunk.value.length === 0) return fail();
      const maximumBuffered = (CODEMODE_LIMITS.toolCalls + 2) *
        (CODEMODE_LIMITS.frameBytes + 4);
      if (buffered.length + chunk.value.length > maximumBuffered) return fail();
      const combined = new Uint8Array(buffered.length + chunk.value.length);
      combined.set(buffered);
      combined.set(chunk.value, buffered.length);
      buffered = combined;
    }
    const result = buffered.slice(0, length);
    buffered = buffered.slice(length);
    return result;
  };
  const read = async (): Promise<unknown> => {
    const header = await take(4);
    const length = new DataView(
      header.buffer,
      header.byteOffset,
      header.byteLength,
    ).getUint32(0, false);
    if (length === 0 || length > CODEMODE_LIMITS.frameBytes) return fail();
    try {
      return JSON.parse(decoder.decode(await take(length)));
    } catch {
      return fail();
    }
  };
  const assertEnd = async (): Promise<void> => {
    if (corrupted || buffered.length > 0) return fail();
    const chunk = await reader.read();
    if (!chunk.done || chunk.value?.length) return fail();
  };
  return { read, assertEnd };
}

/**
 * Terminates every active Code Mode child process during server shutdown.
 *
 * @returns A promise that settles after all active child processes exit.
 */
export async function shutdownCodeModeExecutions(): Promise<void> {
  await Promise.all(
    [...activeExecutions].map((execution) => execution.terminate()),
  );
}

/**
 * Executes a bounded JavaScript async-function body in a fresh restricted Deno subprocess.
 *
 * @param source JavaScript source interpreted as an async-function body.
 * @param input JSON input exposed to the generated function.
 * @param selectedTools Immutable native-tool authority for this execution.
 * @param callTool Dispatches an authorized native tool through MCP.
 * @param signal Cancels the execution when the owning MCP request is cancelled.
 * @returns The explicit JSON-compatible value returned by the function body.
 */
export async function executeCodeMode(
  source: string,
  input: unknown,
  selectedTools: readonly CodeModeSelectedTool[] = [],
  callTool: (name: string, args: unknown) => Promise<unknown> = () =>
    Promise.reject(new Error("Tool is not selected")),
  signal: AbortSignal | undefined = undefined,
): Promise<unknown> {
  if (encoder.encode(source).length > CODEMODE_LIMITS.sourceBytes) {
    throw limitError("source bytes");
  }
  if (bytes(input) > CODEMODE_LIMITS.inputBytes) {
    throw new Error("Code Mode request exceeds byte limit");
  }
  const manifest = selectedTools.map((tool) => ({ ...tool }));
  const authority = new Map(
    manifest.map((tool) => [tool.facadePath, tool.name]),
  );
  const requestValue = {
    jsonrpc: "2.0",
    id: 1,
    method: "execute",
    params: { source, input, manifest },
  };
  if (bytes(requestValue) > CODEMODE_LIMITS.requestBytes) {
    throw limitError("request bytes");
  }

  const releaseExecution = await acquireExecution();
  let child: Deno.ChildProcess | undefined;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  let statusPromise: Promise<Deno.CommandStatus> | undefined;
  let stderrPromise: Promise<BoundedStreamResult> | undefined;
  let terminated = false;
  const terminate = async (): Promise<void> => {
    if (terminated) return;
    terminated = true;
    try {
      await writer?.close();
    } catch { /* stdin may already be closed */ }
    try {
      child?.kill("SIGKILL");
    } catch { /* process may already be gone */ }
    await Promise.allSettled([statusPromise, stderrPromise]);
  };

  try {
    const launch = getCodeModeRunnerLaunch();
    child = new Deno.Command(launch.executable, {
      args: launch.args,
      clearEnv: launch.clearEnv,
      env: launch.env,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const execution: Execution = { child, terminate };
    activeExecutions.add(execution);
    writer = child.stdin.getWriter();
    const frameReader = createCodeModeFrameReader(child.stdout.getReader());
    statusPromise = child.status;
    stderrPromise = drainBoundedStream(child.stderr, CODEMODE_LIMITS.logBytes);
    await writer.write(encodeCodeModeFrame(requestValue));

    const acquireTool = createSemaphore(CODEMODE_LIMITS.concurrentToolCalls);
    let calls = 0;
    let resultBytes = 0;
    let acceptingCalls = true;
    let rejectTerminal!: (error: Error) => void;
    const terminalFailure = new Promise<never>((_, reject) => {
      rejectTerminal = reject;
    });
    const failLimit = (name: string): void => {
      if (!acceptingCalls) return;
      acceptingCalls = false;
      rejectTerminal(limitError(name));
    };
    let writeChain = Promise.resolve();
    const write = (message: unknown): Promise<void> => {
      writeChain = writeChain.then(() =>
        writer!.write(encodeCodeModeFrame(message))
      );
      return writeChain;
    };
    const dispatch = async (message: RunnerMessage): Promise<void> => {
      if (terminated || !acceptingCalls) return;
      if (++calls > CODEMODE_LIMITS.toolCalls) {
        failLimit("tool calls");
        return;
      }
      const path = message.params?.facadePath;
      const nativeName = typeof path === "string"
        ? authority.get(path)
        : undefined;
      if (!nativeName) {
        await write({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32001, message: "Tool is not selected" },
        });
        return;
      }
      try {
        const result = await withSemaphore(
          acquireTool,
          () =>
            acceptingCalls
              ? callTool(nativeName, message.params?.args)
              : Promise.reject(limitError("tool dispatch")),
        );
        if (terminated || !acceptingCalls) return;
        const size = bytes(result);
        if (size > CODEMODE_LIMITS.toolResultBytes) {
          failLimit("tool result bytes");
          return;
        }
        resultBytes += size;
        if (resultBytes > CODEMODE_LIMITS.totalToolResultBytes) {
          failLimit("total tool result bytes");
          return;
        }
        await write({ jsonrpc: "2.0", id: message.id, result });
      } catch (error) {
        if (terminated) return;
        const messageText = error instanceof Error
          ? error.message
          : String(error);
        await write({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32002, message: messageText.slice(0, 500) },
        });
      }
    };

    const processMessages = async (): Promise<unknown> => {
      const pending = new Set<Promise<void>>();
      const callIds = new Set<number>();
      while (true) {
        const value = await frameReader.read();
        if (isToolCall(value)) {
          if (callIds.has(value.id)) throw protocolError();
          callIds.add(value.id);
          const task = dispatch(value).finally(() => pending.delete(task));
          pending.add(task);
          continue;
        }
        if (!isTerminal(value)) throw protocolError();
        acceptingCalls = false;
        await Promise.all(pending);
        if (value.error) throw runnerError(value.error.message);
        if (!value.result) throw protocolError();
        if (bytes(value.result.value) > CODEMODE_LIMITS.finalResultBytes) {
          throw limitError("final result bytes");
        }
        const diagnostics = value.result.diagnostics.join("\n");
        if (encoder.encode(diagnostics).length > CODEMODE_LIMITS.logBytes) {
          throw limitError("log bytes");
        }
        if (value.result.diagnostics.length > 0) {
          logger.debug("Code Mode execution console output", {
            diagnostics: value.result.diagnostics,
          });
        }
        return value.result.value;
      }
    };
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Code Mode execution timed out")),
        CODEMODE_LIMITS.executionTimeoutMs,
      );
    });
    const cancellation = new Promise<never>((_, reject) => {
      if (!signal) return;
      const cancel = () => reject(new Error("Code Mode execution cancelled"));
      if (signal.aborted) cancel();
      else signal.addEventListener("abort", cancel, { once: true });
    });
    let result: unknown;
    try {
      result = await Promise.race([
        processMessages(),
        timeout,
        cancellation,
        terminalFailure,
      ]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
    await writer.close();
    const status = await statusPromise;
    await frameReader.assertEnd();
    const stderr = await stderrPromise;
    if (stderr.text.trim()) {
      logger.debug("Code Mode runner diagnostics", {
        stderr: stderr.text.trim(),
        truncated: stderr.truncated,
      });
    }
    if (!status.success) throw new Error("Code Mode runner failed");
    return result;
  } finally {
    await terminate();
    if (child) {
      activeExecutions.forEach((execution) => {
        if (execution.child === child) activeExecutions.delete(execution);
      });
    }
    releaseExecution();
  }
}
