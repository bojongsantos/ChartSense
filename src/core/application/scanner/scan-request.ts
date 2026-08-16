import { isValidBinanceSymbol, normalizeUsdtSymbol } from "@/core/domain/market/symbol";

export const MAX_SCAN_SYMBOLS = 200;

/** Validate and normalize the browser-configured watchlist before server scans. */
export function parseScanSymbols(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SCAN_SYMBOLS) {
    throw new Error(`symbols must contain 1-${MAX_SCAN_SYMBOLS} items`);
  }

  const symbols = value.map((item) => {
    if (typeof item !== "string" || !/^[\p{L}\p{N}/_-]{2,24}$/u.test(item)) {
      throw new Error("symbols contains an invalid item");
    }
    const symbol = normalizeUsdtSymbol(item);
    if (!isValidBinanceSymbol(symbol)) throw new Error("symbols contains an invalid pair");
    return symbol;
  });

  return [...new Set(symbols)];
}
