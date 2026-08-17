import type { Timeframe } from "@/core/domain/models";

/** Every timeframe the app charts and scans, in display order. */
export const TIMEFRAMES: readonly Timeframe[] = ["15m", "1H", "4H", "1D"];

/** Seconds covered by one candle of each timeframe. */
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "15m": 900,
  "1H": 3_600,
  "4H": 14_400,
  "1D": 86_400,
};

export function isTimeframe(value: unknown): value is Timeframe {
  return typeof value === "string" && TIMEFRAMES.includes(value as Timeframe);
}
