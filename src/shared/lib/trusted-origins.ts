/**
 * Which origins may drive the auth endpoints.
 *
 * This is a CSRF control, not a convenience list: an origin named here can
 * post sign-in and password-change requests carrying the user's cookies. So
 * the list is built from configuration only, never inferred from the incoming
 * request, and anything that does not parse as an absolute http(s) origin is
 * dropped rather than passed through.
 *
 * It exists because a deployment legitimately answers on more than one origin.
 * A single trusted origin was enough while the app had exactly one URL; the
 * moment a second domain was added, every sign-in from the other one failed
 * with "Invalid origin" — an error that names CSRF while the real cause is
 * configuration.
 */

/** An absolute http(s) origin, or null when the value cannot be one. */
export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // `origin` drops any path, query, and trailing slash, so the same host
    // written three different ways collapses to one entry.
    return url.origin;
  } catch {
    return null;
  }
}

export interface TrustedOriginsInput {
  /** The app's own base URL. Always trusted. */
  appUrl: string;
  /** Comma-separated additional origins, typically from an env var. */
  extra?: string | null;
  /** Whether this process is running outside production. */
  development?: boolean;
  /**
   * This machine's own LAN addresses. Honoured in development only, so that
   * the "Network" URL `next dev` prints is usable without extra config.
   */
  lanAddresses?: string[];
}

/**
 * The trusted origin list, deduplicated and in a stable order.
 *
 * Outside production the loopback aliases of the app's own port are added too.
 * `next dev` answers on localhost and 127.0.0.1 alike, and a developer who
 * opens the one the config does not name gets an error that reads like a
 * security failure rather than a mismatch. Production gets no such leniency:
 * every extra origin there has to be named explicitly.
 */
export function resolveTrustedOrigins(input: TrustedOriginsInput): string[] {
  const origins: string[] = [];
  const add = (value: string | null) => {
    if (value && !origins.includes(value)) origins.push(value);
  };

  const base = normalizeOrigin(input.appUrl);
  add(base);

  for (const candidate of (input.extra ?? "").split(",")) {
    add(normalizeOrigin(candidate));
  }

  if (input.development && base) {
    const url = new URL(base);
    const port = url.port ? `:${url.port}` : "";
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      add(`${url.protocol}//localhost${port}`);
      add(`${url.protocol}//127.0.0.1${port}`);
      // `next dev` also advertises a "Network" URL on the machine's LAN
      // address, and opening that one produced an error naming CSRF when the
      // real cause was that the address was simply never configured. Confined
      // to development: in production these would be origins nobody declared.
      for (const address of input.lanAddresses ?? []) {
        add(normalizeOrigin(`${url.protocol}//${address}${port}`));
      }
    }
  }

  return origins;
}
