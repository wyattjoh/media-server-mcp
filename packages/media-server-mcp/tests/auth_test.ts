import { assertEquals } from "@std/assert";
import { validateBearerToken } from "../src/auth.ts";

Deno.test("validateBearerToken - returns true for a valid Bearer token", () => {
  const req = { headers: { authorization: "Bearer my-secret" } };
  assertEquals(validateBearerToken(req, "my-secret"), true);
});

Deno.test("validateBearerToken - returns false when tokens differ", () => {
  const req = { headers: { authorization: "Bearer wrong-token" } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - returns false when authorization header is missing", () => {
  const req = { headers: {} };
  assertEquals(
    validateBearerToken(
      req as { headers: { authorization?: string | string[] | undefined } },
      "my-secret",
    ),
    false,
  );
});

Deno.test("validateBearerToken - returns false for empty authorization header", () => {
  const req = { headers: { authorization: "" } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - returns false for Basic auth scheme", () => {
  const req = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
  assertEquals(validateBearerToken(req, "dXNlcjpwYXNz"), false);
});

Deno.test("validateBearerToken - returns false for bare token without Bearer prefix", () => {
  const req = { headers: { authorization: "my-secret" } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - returns false when token length differs", () => {
  // SHA-256 hashing normalizes lengths internally, so this tests that
  // different-length tokens still correctly reject without leaking length.
  const req = { headers: { authorization: "Bearer short" } };
  assertEquals(validateBearerToken(req, "a-much-longer-token"), false);
});

Deno.test("validateBearerToken - handles array authorization header", () => {
  const req = {
    headers: { authorization: ["Bearer my-secret", "Bearer other"] },
  };
  assertEquals(validateBearerToken(req, "my-secret"), true);
});

Deno.test("validateBearerToken - returns false for array with invalid first entry", () => {
  const req = { headers: { authorization: ["Basic foo", "Bearer my-secret"] } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - returns false for 'Bearer ' with only whitespace after prefix", () => {
  const req = { headers: { authorization: "Bearer " } };
  // Empty token vs non-empty expected
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - rejects 'bearer' (lowercase) prefix", () => {
  const req = { headers: { authorization: "bearer my-secret" } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});

Deno.test("validateBearerToken - rejects token with extra leading space", () => {
  // "Bearer  my-secret" (double space) → extracted token = " my-secret"
  const req = { headers: { authorization: "Bearer  my-secret" } };
  assertEquals(validateBearerToken(req, "my-secret"), false);
});
