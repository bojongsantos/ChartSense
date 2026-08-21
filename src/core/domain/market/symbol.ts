const QUOTE = "USDT";

/** Normalize a base asset or full pair into one Binance USDT symbol. */
export function normalizeUsdtSymbol(value: string): string {
  const compact = value.trim().toUpperCase().replace(/[\s/_-]+/g, "");
  if (!compact) return `BTC${QUOTE}`;
  return compact.endsWith(QUOTE) ? compact : `${compact}${QUOTE}`;
}

export function isValidBinanceSymbol(value: string): boolean {
  const length = Array.from(value).length;
  return length >= 4 && length <= 20 && /^[\p{L}\p{N}]+$/u.test(value);
}

/** Keep preferred symbols first without limiting search to a user's watchlist. */
export function mergeSearchableSymbols(preferred: string[], catalog: string[]): string[] {
  return [...new Set([...preferred, ...catalog].map((symbol) => symbol.trim().toUpperCase()))]
    .filter(isValidBinanceSymbol);
}

export function filterSearchableSymbols(
  catalog: string[],
  query: string,
  excluded: Iterable<string> = [],
  limit = 8,
): string[] {
  const needle = query.trim().toUpperCase().replace(/[\s/_-]+/g, "");
  if (!needle) return [];
  const blocked = new Set(excluded);
  const matches = catalog.filter(
    (symbol) => !blocked.has(symbol) && symbol.replace(/USDT$/, "").includes(needle),
  );

  // Assets whose name *starts* with the query come first. Typing "E" should
  // reach ETH, not bury it under every coin with an E somewhere in the middle;
  // a plain substring match ordered by catalog position did exactly that.
  const prefix: string[] = [];
  const rest: string[] = [];
  for (const symbol of matches) {
    (symbol.replace(/USDT$/, "").startsWith(needle) ? prefix : rest).push(symbol);
  }
  return [...prefix, ...rest].slice(0, limit);
}
