import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two hex digests.
 *
 * Shape is checked before the bytes because `timingSafeEqual` throws on
 * mismatched buffer lengths, and a thrown comparison would leak the same fact
 * an early `false` does — only as a 500 instead of a rejection. Comparing hex
 * strings directly would also stop at the first differing character, which is
 * exactly the timing signal this avoids.
 *
 * Shared by every provider adapter: they disagree on what gets signed, never
 * on how a digest is checked.
 */
export function hexDigestMatches(supplied: string, expected: string): boolean {
  if (!/^[0-9a-fA-F]+$/.test(supplied) || supplied.length !== expected.length) return false;
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}
