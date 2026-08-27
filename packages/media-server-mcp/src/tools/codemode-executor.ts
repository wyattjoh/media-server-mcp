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

type Execution = { child: Deno.ChildProcess; terminate: () => Promise<void> };

let runningExecutions = 0;
const executionWaiters: (() => void)[] = [];
const activeExecutions = new Set<Execution>();

function bytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

function limitError(name: string): Error {
  return new Error(`Code Mode ${name} exceeds limit`);
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

function encodeFrame(value: unknown): Uint8Array {
  const body = encoder.encode(JSON.stringify(value));
  if (body.length === 0 || body.length > CODEMODE_LIMITS.frameBytes) {
    throw limitError("frame bytes");
  }
  const frame = new Uint8Array(4 + body.length);
  new DataView(frame.buffer).setUint32(0, body.length, false);
  frame.set(body, 4);
  return frame;
}

function createFrameReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): () => Promise<RunnerMessage> {
  let buffered = new Uint8Array();
  const take = async (length: number): Promise<Uint8Array> => {
    while (buffered.length < length) {
      const { value, done } = await reader.read();
      if (done || !value) throw new Error("Code Mode runner protocol error");
      if (buffered.length + value.length > CODEMODE_LIMITS.frameBytes + 4) {
        throw limitError("frame bytes");
      }
      const combined = new Uint8Array(buffered.length + value.length);
      combined.set(buffered);
      combined.set(value, buffered.length);
      buffered = combined;
    }
    const result = buffered.slice(0, length);
    buffered = buffered.slice(length);
    return result;
  };
  return async () => {
    const header = await take(4);
    const length = new DataView(header.buffer).getUint32(0, false);
    if (length === 0 || length > CODEMODE_LIMITS.frameBytes) {
      throw new Error("Code Mode runner protocol error");
    }
    try {
      return JSON.parse(decoder.decode(await take(length))) as RunnerMessage;
    } catch {
      throw new Error("Code Mode runner protocol error");
    }
  };
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
  let stderrPromise: Promise<ArrayBuffer> | undefined;
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
    const runnerUrl = new URL("./codemode-runner.ts", import.meta.url);
    child = new Deno.Command(Deno.execPath(), {
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
    const execution: Execution = { child, terminate };
    activeExecutions.add(execution);
    writer = child.stdin.getWriter();
    const readFrame = createFrameReader(child.stdout.getReader());
    statusPromise = child.status;
    stderrPromise = new Response(child.stderr).arrayBuffer();
    await writer.write(encodeFrame(requestValue));

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
      writeChain = writeChain.then(() => writer!.write(encodeFrame(message)));
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
      while (true) {
        const message = await readFrame();
        if (message.method === "tool.call") {
          const task = dispatch(message).finally(() => pending.delete(task));
          pending.add(task);
          continue;
        }
        if (message.id !== 1) {
          throw new Error("Code Mode runner protocol error");
        }
        if (message.error) throw new Error(message.error.message);
        if (!message.result) throw new Error("Code Mode runner protocol error");
        await Promise.all(pending);
        if (bytes(message.result.value) > CODEMODE_LIMITS.finalResultBytes) {
          throw limitError("final result bytes");
        }
        const diagnostics = message.result.diagnostics.join("\n");
        if (encoder.encode(diagnostics).length > CODEMODE_LIMITS.logBytes) {
          throw limitError("log bytes");
        }
        if (message.result.diagnostics.length > 0) {
          logger.debug("Code Mode execution console output", {
            diagnostics: message.result.diagnostics,
          });
        }
        return message.result.value;
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
    const stderr = decoder.decode(await stderrPromise).trim();
    if (stderr) {
      logger.debug("Code Mode runner diagnostics", {
        stderr: stderr.slice(0, CODEMODE_LIMITS.logBytes),
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
