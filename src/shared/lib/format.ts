/**
 * Number of decimals TradingView-style, adapted to the price magnitude:
 *  BTC (~$60k)  -> 1-2 dp
 *  ETH (~$3k)   -> 2 dp
 *  SOL (~$70)   -> 3-4 dp
 *  DOGE (~$0.07)-> 5-6 dp
 *  PEPE (~$0.00001) -> 8+ dp
 */
export function priceDecimals(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 2;
  const abs = Math.abs(value);
  if (abs >= 10000) return 1;
  if (abs >= 1000) return 2;
  if (abs >= 100) return 3;
  if (abs >= 10) return 4;
  if (abs >= 1) return 5;
  if (abs >= 0.1) return 6;
  if (abs >= 0.01) return 7;
  if (abs >= 0.001) return 8;
  return 9;
}

/** Price with adaptive decimals, trailing zeros trimmed (TradingView-like). */
export function formatPrice(value: number, precision?: number): string {
  const dp = precision ?? priceDecimals(value);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
    useGrouping: false,
  });
}

/** Price with adaptive decimals and full (untrimmed) precision. */
export function formatPriceFixed(value: number, precision?: number): string {
  const dp = precision ?? priceDecimals(value);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
    useGrouping: false,
  });
}

export function formatPercent(value: number, sign = true): string {
  const s = value > 0 && sign ? "+" : "";
  return `${s}${value.toFixed(2)}%`;
}

export function formatSigned(value: number): string {
  const s = value > 0 ? "+" : value < 0 ? "" : "";
  return `${s}${value.toFixed(2)}%`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
