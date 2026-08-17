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
  return catalog
    .filter((symbol) => !blocked.has(symbol) && symbol.replace(/USDT$/, "").includes(needle))
    .slice(0, limit);
}
