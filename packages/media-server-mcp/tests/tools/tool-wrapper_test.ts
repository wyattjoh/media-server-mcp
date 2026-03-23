import { assertEquals } from "@std/assert";
import { wrapToolHandler } from "../../src/tools/tool-wrapper.ts";

Deno.test("wrapToolHandler returns handler result on success", async () => {
  const handler = wrapToolHandler("test_tool", () => ({
    content: [{ type: "text" as const, text: "ok" }],
  }));
  const result = await handler({}, {} as never);
  assertEquals(result.content, [{ type: "text", text: "ok" }]);
  assertEquals(result.isError, undefined);
});

Deno.test("wrapToolHandler sets isError true on thrown Error", async () => {
  const handler = wrapToolHandler("test_tool", () => {
    throw new Error("boom");
  });
  const result = await handler({}, {} as never);
  assertEquals(result.isError, true);
  assertEquals(result.content[0].type, "text");
  // Verify error message is included
  if (result.content[0].type === "text") {
    assertEquals(result.content[0].text.includes("boom"), true);
  }
});

Deno.test("wrapToolHandler handles non-Error throws", async () => {
  const handler = wrapToolHandler("test_tool", () => {
    throw "string error";
  });
  const result = await handler({}, {} as never);
  assertEquals(result.isError, true);
  if (result.content[0].type === "text") {
    assertEquals(result.content[0].text.includes("string error"), true);
  }
});
