const MAX_FRAME_BYTES = 256 * 1024;
const MAX_RESULT_BYTES = 128 * 1024;
const MAX_RESULT_DEPTH = 32;
const MAX_DIAGNOSTIC_BYTES = 8 * 1024;

type SelectedTool = { name: string; facadePath: string };
type JsonRpcMessage = {
  jsonrpc: "2.0";
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
let writeChain = Promise.resolve();

async function readExact(length: number): Promise<Uint8Array> {
  const bytes = new Uint8Array(length);
  let offset = 0;
  while (offset < length) {
    const count = await Deno.stdin.read(bytes.subarray(offset));
    if (count === null) throw new Error("Unexpected end of request");
    offset += count;
  }
  return bytes;
}

async function readFrame(): Promise<JsonRpcMessage> {
  const header = await readExact(4);
  const length = new DataView(header.buffer).getUint32(0, false);
  if (length === 0 || length > MAX_FRAME_BYTES) {
    throw new Error("Invalid request frame");
  }
  return JSON.parse(decoder.decode(await readExact(length))) as JsonRpcMessage;
}

function writeFrame(response: JsonRpcMessage): Promise<void> {
  const body = encoder.encode(JSON.stringify(response));
  if (body.length > MAX_FRAME_BYTES) {
    return Promise.reject(new Error("Response frame exceeds limit"));
  }
  const frame = new Uint8Array(4 + body.length);
  new DataView(frame.buffer).setUint32(0, body.length, false);
  frame.set(body, 4);
  writeChain = writeChain.then(() =>
    Deno.stdout.write(frame).then(() => undefined)
  );
  return writeChain;
}

function validateJsonValue(
  value: unknown,
  depth = 0,
  seen = new Set<object>(),
): void {
  if (depth > MAX_RESULT_DEPTH) throw new Error("Result exceeds depth limit");
  if (
    value === null || typeof value === "string" || typeof value === "boolean"
  ) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Result is not valid JSON");
    return;
  }
  if (typeof value !== "object") throw new Error("Result is not valid JSON");
  if (seen.has(value)) throw new Error("Result contains a cycle");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) validateJsonValue(item, depth + 1, seen);
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("Result is not valid JSON");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") throw new Error("Result is not valid JSON");
      validateJsonValue(
        (value as Record<string, unknown>)[key],
        depth + 1,
        seen,
      );
    }
  }
  seen.delete(value);
}

function publicMessage(error: unknown): string {
  if (error instanceof SyntaxError) return "JavaScript syntax error";
  if (error instanceof Error) {
    const stable = [
      "Result exceeds depth limit",
      "Result is not valid JSON",
      "Result contains a cycle",
      "Result exceeds byte limit",
    ];
    if (stable.includes(error.message)) return error.message;
  }
  return "JavaScript execution failed";
}

function formatDiagnostic(args: unknown[]): string {
  return args.map((value) => {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }).join(" ");
}

function createFacade(
  manifest: readonly SelectedTool[],
): Readonly<Record<string, unknown>> {
  let nextId = 2;
  const pending = new Map<
    number,
    {
      tool: string;
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  let responseLoopStarted = false;
  const responseLoop = async (): Promise<void> => {
    try {
      while (pending.size > 0) {
        const response = await readFrame();
        const deferred = pending.get(response.id);
        if (!deferred || response.jsonrpc !== "2.0") {
          throw new Error("Tool protocol error");
        }
        pending.delete(response.id);
        if (response.error) {
          const tool = deferred.tool;
          const ToolExecutionError = class extends Error {
            readonly tool = tool;
            constructor(message: string) {
              super(message);
              this.name = "ToolExecutionError";
            }
          };
          deferred.reject(new ToolExecutionError(response.error.message));
        } else deferred.resolve(response.result);
      }
    } finally {
      responseLoopStarted = false;
      if (pending.size > 0) void startResponseLoop();
    }
  };
  const startResponseLoop = (): Promise<void> => {
    if (responseLoopStarted) return Promise.resolve();
    responseLoopStarted = true;
    return responseLoop();
  };
  const root: Record<string, unknown> = {};
  for (const selected of manifest) {
    const segments = selected.facadePath.split(".");
    if (segments.shift() !== "tools" || segments.length < 2) {
      throw new Error("Invalid tool manifest");
    }
    let target = root;
    for (const segment of segments.slice(0, -1)) {
      target[segment] ??= {};
      target = target[segment] as Record<string, unknown>;
    }
    const method = segments.at(-1)!;
    target[method] = async (args: unknown = {}) => {
      const id = nextId++;
      const result = new Promise<unknown>((resolve, reject) =>
        pending.set(id, { tool: selected.facadePath, resolve, reject })
      );
      await writeFrame({
        jsonrpc: "2.0",
        id,
        method: "tool.call",
        params: { facadePath: selected.facadePath, args },
      });
      void startResponseLoop();
      return await result;
    };
  }
  const freeze = (
    value: Record<string, unknown>,
  ): Readonly<Record<string, unknown>> => {
    for (const nested of Object.values(value)) {
      if (nested && typeof nested === "object") {
        freeze(nested as Record<string, unknown>);
      }
    }
    return Object.freeze(value);
  };
  return freeze(root);
}

async function main(): Promise<void> {
  let request: JsonRpcMessage;
  try {
    request = await readFrame();
  } catch {
    await writeFrame({
      jsonrpc: "2.0",
      id: 0,
      error: { code: -32600, message: "Invalid runner request" },
    });
    return;
  }
  const params = request.params;
  if (
    request.jsonrpc !== "2.0" || request.method !== "execute" ||
    typeof params?.source !== "string" || !Array.isArray(params.manifest)
  ) {
    await writeFrame({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32600, message: "Invalid runner request" },
    });
    return;
  }
  const diagnostics: string[] = [];
  let diagnosticBytes = 0;
  const capture = (...args: unknown[]): void => {
    const message = formatDiagnostic(args);
    const length = encoder.encode(message).length;
    if (diagnosticBytes + length <= MAX_DIAGNOSTIC_BYTES) {
      diagnostics.push(message);
      diagnosticBytes += length;
    }
  };
  Object.defineProperty(globalThis, "console", {
    value: Object.freeze({
      log: capture,
      debug: capture,
      info: capture,
      warn: capture,
      error: capture,
    }),
    configurable: false,
    writable: false,
  });
  try {
    const AsyncFunction =
      Object.getPrototypeOf(async function () {}).constructor;
    const execute = new AsyncFunction(
      "tools",
      "input",
      '"use strict";\n' + params.source,
    ) as (
      tools: Readonly<Record<string, unknown>>,
      input: unknown,
    ) => Promise<unknown>;
    const value = await execute(
      createFacade(params.manifest as SelectedTool[]),
      params.input,
    );
    validateJsonValue(value);
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("Result is not valid JSON");
    if (encoder.encode(serialized).length > MAX_RESULT_BYTES) {
      throw new Error("Result exceeds byte limit");
    }
    await writeFrame({
      jsonrpc: "2.0",
      id: request.id,
      result: { value, diagnostics },
    });
  } catch (error) {
    await writeFrame({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32000, message: publicMessage(error) },
    });
  }
}

await main();
