import { getLogger } from "../logging.ts";

const MAX_SOURCE_BYTES = 64 * 1024;
const MAX_FRAME_BYTES = 256 * 1024;
const EXECUTION_TIMEOUT_MS = 1_000;

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

function encodeFrame(value: unknown): Uint8Array {
  const body = encoder.encode(JSON.stringify(value));
  if (body.length === 0 || body.length > MAX_FRAME_BYTES) {
    throw new Error("Code Mode request exceeds byte limit");
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
    if (length === 0 || length > MAX_FRAME_BYTES) {
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
 * Executes a bounded JavaScript async-function body in a fresh restricted Deno
 * subprocess and returns its explicit JSON value.
 *
 * @param source JavaScript source interpreted as an async-function body.
 * @param input Optional JSON input supplied to the function body.
 * @param selectedTools Immutable native-tool authority for this execution.
 * @param callTool Dispatches an authorized native tool through MCP.
 * @returns The explicit JSON-compatible value returned by the function body.
 */
export async function executeCodeMode(
  source: string,
  input: unknown,
  selectedTools: readonly CodeModeSelectedTool[] = [],
  callTool: (name: string, args: unknown) => Promise<unknown> = () =>
    Promise.reject(new Error("Tool is not selected")),
): Promise<unknown> {
  if (encoder.encode(source).length > MAX_SOURCE_BYTES) {
    throw new Error("Code Mode source exceeds byte limit");
  }
  const manifest = selectedTools.map((tool) => ({ ...tool }));
  const authority = new Map(
    manifest.map((tool) => [tool.facadePath, tool.name]),
  );
  const request = encodeFrame({
    jsonrpc: "2.0",
    id: 1,
    method: "execute",
    params: { source, input, manifest },
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

  const writer = child.stdin.getWriter();
  const readFrame = createFrameReader(child.stdout.getReader());
  await writer.write(request);
  const statusPromise = child.status;
  const stderrPromise = new Response(child.stderr).arrayBuffer();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Code Mode execution timed out")),
      EXECUTION_TIMEOUT_MS,
    );
  });

  const processMessages = async (): Promise<unknown> => {
    while (true) {
      const message = await readFrame();
      if (message.method === "tool.call") {
        const path = message.params?.facadePath;
        const args = message.params?.args;
        const nativeName = typeof path === "string"
          ? authority.get(path)
          : undefined;
        if (!nativeName) {
          await writer.write(encodeFrame({
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32001, message: "Tool is not selected" },
          }));
          continue;
        }
        try {
          const result = await callTool(nativeName, args);
          await writer.write(
            encodeFrame({ jsonrpc: "2.0", id: message.id, result }),
          );
        } catch (error) {
          const publicMessage = error instanceof Error
            ? error.message
            : String(error);
          await writer.write(encodeFrame({
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32002, message: publicMessage.slice(0, 500) },
          }));
        }
        continue;
      }
      if (message.id !== 1) throw new Error("Code Mode runner protocol error");
      if (message.error) throw new Error(message.error.message);
      if (!message.result) throw new Error("Code Mode runner protocol error");
      if (message.result.diagnostics.length > 0) {
        logger.debug("Code Mode execution console output", {
          diagnostics: message.result.diagnostics,
        });
      }
      return message.result.value;
    }
  };

  try {
    const result = await Promise.race([processMessages(), timeout]);
    await writer.close();
    const status = await statusPromise;
    const stderr = decoder.decode(await stderrPromise).trim();
    if (stderr) logger.debug("Code Mode runner diagnostics", { stderr });
    if (!status.success) throw new Error("Code Mode runner failed");
    return result;
  } catch (error) {
    try {
      child.kill("SIGKILL");
    } catch {
      // The process already exited.
    }
    try {
      await writer.close();
    } catch {
      // The child may have closed stdin.
    }
    await statusPromise;
    await stderrPromise;
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
