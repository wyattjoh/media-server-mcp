/**
 * Shared authentication utilities for HTTP-based MCP transports.
 */

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Computes the SHA-256 hash of a string, returning a fixed-length Buffer.
 * Used to normalize token lengths before constant-time comparison,
 * preventing timing side-channels that leak token length.
 */
function sha256(input: string): Uint8Array {
  return createHash("sha256").update(input).digest();
}

/**
 * Validates a Bearer token from an HTTP Authorization header.
 * Uses SHA-256 hashing before constant-time comparison to prevent
 * timing attacks — including length-based side channels.
 *
 * @param req - The HTTP request with authorization header
 * @param expectedToken - The expected token value
 * @returns true if the token matches the expected value
 */
export function validateBearerToken(
  req: { headers: { authorization?: string | string[] | undefined } },
  expectedToken: string,
): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return false;
  }

  // Handle case where authorization header could be an array
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return false;
  }

  const token = headerValue.slice(7);

  // Hash both values to fixed-length buffers before comparison.
  // This eliminates the length pre-check that would leak token length
  // through timing, while keeping the comparison constant-time.
  return timingSafeEqual(sha256(token), sha256(expectedToken));
}
