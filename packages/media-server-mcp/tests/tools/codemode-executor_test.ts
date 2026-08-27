import { assertEquals, assertRejects } from "@std/assert";
import {
  CODEMODE_LIMITS,
  createCodeModeFrameReader,
  drainBoundedStream,
  encodeCodeModeFrame,
  executeCodeMode,
} from "../../src/tools/codemode-executor.ts";

function readerFromChunks(
  chunks: readonly Uint8Array[],
): ReadableStreamDefaultReader<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  }).getReader();
}

Deno.test("codemode frame reader handles every byte split", async () => {
  const expected = { jsonrpc: "2.0", id: 1, result: { value: 42 } };
  const frame = encodeCodeModeFrame(expected);
  for (let split = 1; split < frame.length; split++) {
    const protocol = createCodeModeFrameReader(
      readerFromChunks([frame.slice(0, split), frame.slice(split)]),
    );
    assertEquals(await protocol.read(), expected);
    await protocol.assertEnd();
  }
});

Deno.test("codemode frame reader handles coalesced frames", async () => {
  const first = encodeCodeModeFrame({ id: 2 });
  const second = encodeCodeModeFrame({ id: 3 });
  const combined = new Uint8Array(first.length + second.length);
  combined.set(first);
  combined.set(second, first.length);
  const protocol = createCodeModeFrameReader(readerFromChunks([combined]));
  assertEquals(await protocol.read(), { id: 2 });
  assertEquals(await protocol.read(), { id: 3 });
  await protocol.assertEnd();
});

Deno.test("codemode frame reader rejects corrupt input without resynchronizing", async () => {
  const valid = encodeCodeModeFrame({ id: 1 });
  const cases = [
    new Uint8Array(),
    valid.slice(0, 3),
    valid.slice(0, valid.length - 1),
    new Uint8Array([0, 0, 0, 0]),
    new Uint8Array([0, 4, 0, 1]),
    new Uint8Array([0, 0, 0, 2, 0xc3, 0x28]),
    new Uint8Array([0, 0, 0, 1, 0x7b]),
  ];
  const oversized = new Uint8Array(4);
  new DataView(oversized.buffer).setUint32(
    0,
    CODEMODE_LIMITS.frameBytes + 1,
    false,
  );
  cases.push(oversized);

  for (const bytes of cases) {
    const protocol = createCodeModeFrameReader(readerFromChunks([bytes]));
    await assertRejects(
      () => protocol.read(),
      Error,
      "Code Mode runner protocol error",
    );
    await assertRejects(
      () => protocol.read(),
      Error,
      "Code Mode runner protocol error",
    );
  }
});

Deno.test("codemode frame reader bounds random hostile bytes", async () => {
  let seed = 0x12345678;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let index = 0; index < 100; index++) {
    const bytes = new Uint8Array(random() % 128);
    for (let offset = 0; offset < bytes.length; offset++) {
      bytes[offset] = random() & 0xff;
    }
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < bytes.length;) {
      const size = 1 + (random() % 8);
      chunks.push(bytes.slice(offset, offset + size));
      offset += size;
    }
    await assertRejects(
      () => createCodeModeFrameReader(readerFromChunks(chunks)).read(),
      Error,
      "Code Mode runner protocol error",
    );
  }
});

function sourceWritingFrame(value: unknown): string {
  return `
    const body = new TextEncoder().encode(${
    JSON.stringify(JSON.stringify(value))
  });
    const frame = new Uint8Array(body.length + 4);
    new DataView(frame.buffer).setUint32(0, body.length, false);
    frame.set(body, 4);
    await Deno.stdout.write(frame);
    return null;
  `;
}

Deno.test("codemode frame reader handles random JSON and chunking", async () => {
  let seed = 0x87654321;
  const random = (): number => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed;
  };
  for (let index = 0; index < 100; index++) {
    const value = {
      id: random() % 1000,
      text: String.fromCharCode(32 + (random() % 90)).repeat(random() % 32),
      values: [random() % 10, (random() & 1) === 0, null],
    };
    const frame = encodeCodeModeFrame(value);
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < frame.length;) {
      const size = 1 + (random() % 11);
      chunks.push(frame.slice(offset, offset + size));
      offset += size;
    }
    const protocol = createCodeModeFrameReader(readerFromChunks(chunks));
    assertEquals(await protocol.read(), value);
    await protocol.assertEnd();
  }
});

Deno.test("invalid JSON-RPC shapes and extra terminal frames fail closed", async () => {
  const hostileValues = [
    null,
    [],
    {},
    { jsonrpc: "1.0", id: 2, method: "tool.call", params: {} },
    { jsonrpc: "2.0", id: 0, method: "tool.call", params: {} },
    { jsonrpc: "2.0", id: 2, method: "unknown", params: {} },
    { jsonrpc: "2.0", id: 1, result: {}, error: { code: 1, message: "x" } },
    {
      jsonrpc: "2.0",
      id: 1,
      result: { value: "forged", diagnostics: [] },
    },
  ];
  for (const value of hostileValues) {
    await assertRejects(
      () => executeCodeMode(sourceWritingFrame(value), null),
      Error,
      "Code Mode runner protocol error",
    );
  }
});

Deno.test("duplicate child request IDs fail closed", async () => {
  const call = {
    jsonrpc: "2.0",
    id: 2,
    method: "tool.call",
    params: { facadePath: "tools.tmdb.searchMovies", args: {} },
  };
  const serialized = JSON.stringify(JSON.stringify(call));
  const source = `
    const write = async () => {
      const body = new TextEncoder().encode(${serialized});
      const frame = new Uint8Array(body.length + 4);
      new DataView(frame.buffer).setUint32(0, body.length, false);
      frame.set(body, 4);
      await Deno.stdout.write(frame);
    };
    await write();
    await write();
    return null;
  `;
  await assertRejects(
    () => executeCodeMode(source, null),
    Error,
    "Code Mode runner protocol error",
  );
});

Deno.test("hostile child output is isolated from later executions", async () => {
  const corrupt = executeCodeMode(
    "await Deno.stdout.write(new Uint8Array([0, 0, 0, 0])); return null;",
    null,
  );
  await assertRejects(
    () => corrupt,
    Error,
    "Code Mode runner protocol error",
  );
  assertEquals(await executeCodeMode("return 42;", null), 42);
});

Deno.test("forged child tool frames cannot exceed granted authority", async () => {
  let calls = 0;
  const source = `
    const body = new TextEncoder().encode(JSON.stringify({
      jsonrpc: "2.0", id: 2, method: "tool.call",
      params: { facadePath: "tools.tmdb.searchMovies", args: {} }
    }));
    const frame = new Uint8Array(body.length + 4);
    new DataView(frame.buffer).setUint32(0, body.length, false);
    frame.set(body, 4);
    await Deno.stdout.write(frame);
    return null;
  `;
  assertEquals(
    await executeCodeMode(source, null, [], () => {
      calls++;
      return Promise.resolve({});
    }),
    null,
  );
  assertEquals(calls, 0);
});

Deno.test("codemode drains hostile diagnostics with bounded retention", async () => {
  const result = await drainBoundedStream(
    new Blob([new Uint8Array(CODEMODE_LIMITS.logBytes * 4).fill(65)]).stream(),
    CODEMODE_LIMITS.logBytes,
  );
  assertEquals(result.text.length, CODEMODE_LIMITS.logBytes);
  assertEquals(result.truncated, true);
});

Deno.test("generated code has no filesystem, environment, process, or FFI authority", async () => {
  const source = `
    const denied = async (operation) => {
      try { await operation(); return false; } catch { return true; }
    };
    return await Promise.all([
      denied(() => Deno.readTextFile(${JSON.stringify(import.meta.url)})),
      denied(() => Deno.writeTextFile('/tmp/codemode-hostile', 'owned')),
      denied(() => Promise.resolve(Deno.env.toObject())),
      denied(() => new Deno.Command(Deno.execPath()).output()),
      denied(() => Promise.resolve(Deno.dlopen('/tmp/not-a-library', {}))),
    ]);
  `;
  assertEquals(
    await executeCodeMode(source, null),
    [true, true, true, true, true],
  );
});

Deno.test("generated code has no public, local, configured-host, DNS, or metadata network authority", async () => {
  const source = `
    const denied = async (url) => {
      try { await fetch(url); return false; } catch { return true; }
    };
    return await Promise.all([
      denied('https://example.com'),
      denied('http://localhost:32400'),
      denied('http://radarr.invalid:7878'),
      denied('http://169.254.169.254/latest/meta-data/'),
    ]);
  `;
  assertEquals(
    await executeCodeMode(source, null),
    [true, true, true, true],
  );
});

Deno.test("dynamic imports cannot acquire ambient authority", async () => {
  const source = `
    const denied = async (operation) => {
      try { await operation(); return false; } catch { return true; }
    };
    const dataModule = await import('data:text/javascript,export default typeof Deno');
    return {
      local: await denied(() => import(${JSON.stringify(import.meta.url)})),
      remote: await denied(() => import('https://example.com/hostile.js')),
      npm: await denied(() => import('npm:node-fetch')),
      dataModuleLoaded: dataModule.default === 'object',
      dataRead: await denied(async () => {
        const module = await import("data:text/javascript,export default () => Deno.readTextFile('/etc/passwd')");
        await module.default();
      }),
    };
  `;
  assertEquals(await executeCodeMode(source, null), {
    local: true,
    remote: true,
    npm: true,
    dataModuleLoaded: true,
    dataRead: true,
  });

  for (
    const importSource of [
      "await import('jsr:@std/path');",
      "const fs = await import('node:fs/promises'); await fs.readFile('/etc/passwd');",
      "const child = await import('node:child_process'); child.spawnSync('sh', ['-c', 'id']);",
    ]
  ) {
    await assertRejects(
      () => executeCodeMode(`${importSource} return null;`, null),
      Error,
    );
  }
});

Deno.test("dynamic code, globals, WebAssembly, and workers cannot bypass authority", async () => {
  const source = `
    const denied = async (operation) => {
      try { await operation(); return false; } catch { return true; }
    };
    return {
      evalRead: await denied(() => eval("Deno.readTextFile('/etc/passwd')")),
      functionEnv: await denied(() => Function("return Deno.env.toObject()")()),
      constructorRun: await denied(() => (async () => {}).constructor("return new Deno.Command('id').output()")()),
      globalWrite: await denied(() => globalThis.Deno.writeTextFile('/tmp/codemode-global', 'owned')),
      wasmRead: typeof WebAssembly === 'object' && await denied(() => Deno.readFile('/etc/passwd')),
      worker: await denied(() => Promise.resolve(new Worker('data:text/javascript,postMessage(1)', { type: 'module' }))),
    };
  `;
  assertEquals(await executeCodeMode(source, null), {
    evalRead: true,
    functionEnv: true,
    constructorRun: true,
    globalWrite: true,
    wasmRead: true,
    worker: true,
  });
});

Deno.test("hostile logs and public errors remain bounded and sanitized", async () => {
  assertEquals(
    await executeCodeMode(
      `
        console.log('x'.repeat(${CODEMODE_LIMITS.logBytes * 4}));
        for (let i = 0; i < 1000; i++) console.error('ignored', i);
        await Deno.stderr.write(new Uint8Array(${
        CODEMODE_LIMITS.logBytes * 4
      }).fill(65));
        return 'complete';
      `,
      null,
    ),
    "complete",
  );
  await assertRejects(
    () =>
      executeCodeMode(
        "throw new Error('secret=/repo/.env token=credential intermediate=private');",
        null,
      ),
    Error,
    "JavaScript execution failed",
  );
});

Deno.test("fresh executions cannot observe prior generated state", async () => {
  assertEquals(
    await executeCodeMode(
      "globalThis.hostileState = { secret: input }; return 'stored';",
      "private",
    ),
    "stored",
  );
  assertEquals(
    await executeCodeMode(
      "return { state: globalThis.hostileState ?? null, input, tools: Object.keys(tools) };",
      null,
    ),
    { state: null, input: null, tools: [] },
  );
});
