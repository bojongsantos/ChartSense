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
