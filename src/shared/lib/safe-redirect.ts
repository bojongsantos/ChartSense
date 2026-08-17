/** Where users land when a requested destination is missing or unsafe. */
export const DEFAULT_REDIRECT = "/";

/**
 * True when the string carries a character a browser strips before parsing a
 * URL. Checked by code point rather than a regex so the control characters
 * stay readable in source.
 */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Resolves a `next` parameter into a destination that can only ever stay on
 * this site.
 *
 * A `startsWith("/")` check is not enough. `//evil.com` is a protocol-relative
 * URL, and browsers normalise backslashes to slashes, so `/\evil.com` escapes
 * too. Both would send a user who just typed their password to an attacker's
 * page, which is exactly the moment a convincing fake login costs the most.
 */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_REDIRECT;

  // Percent-encoding can hide a leading slash pair from a naive check.
  let candidate: string;
  try {
    candidate = decodeURIComponent(next);
  } catch {
    return DEFAULT_REDIRECT;
  }

  // A tab inside "/\t/evil.com" would collapse into "//evil.com" only after
  // our check had already passed.
  if (hasControlCharacter(candidate)) return DEFAULT_REDIRECT;

  const normalised = candidate.replace(/\\/g, "/");
  if (!normalised.startsWith("/")) return DEFAULT_REDIRECT;
  if (normalised.startsWith("//")) return DEFAULT_REDIRECT;

  return normalised;
}
