import type { SetupDirection, Timeframe } from "@/core/domain/models";

export type SetupOutcome = "OPEN" | "TARGET_HIT" | "STOPPED_OUT" | "CANCELED";

export interface JournalSetup {
  direction: SetupDirection;
  entry: number;
  target1: number;
  stopLoss: number;
}

/** Price extremes observed since the setup was recorded. */
export interface PriceWindow {
  high: number;
  low: number;
}

/**
 * Resolves a recorded setup against the price range the market has covered.
 *
 * When a window touched both the target and the stop, the stop wins. Intra-bar
 * order is unknowable from a high/low pair, and a journal that resolves the
 * ambiguous case in the trader's favour would report a success rate the
 * strategy never earned.
 */
export function resolveSetupOutcome(setup: JournalSetup, window: PriceWindow): SetupOutcome {
  if (!Number.isFinite(window.high) || !Number.isFinite(window.low)) return "OPEN";

  const stopped =
    setup.direction === "long" ? window.low <= setup.stopLoss : window.high >= setup.stopLoss;
  if (stopped) return "STOPPED_OUT";

  const reachedTarget =
    setup.direction === "long" ? window.high >= setup.target1 : window.low <= setup.target1;
  return reachedTarget ? "TARGET_HIT" : "OPEN";
}

/**
 * Stable identity for a setup so the same plan saved twice is one journal row.
 * Prices are rounded before hashing because a live feed jitters in the last
 * decimals without the plan itself having changed.
 */
export function setupSignature(input: {
  symbol: string;
  timeframe: Timeframe;
  direction: SetupDirection;
  entry: number;
  stopLoss: number;
}): string {
  const round = (value: number) => value.toPrecision(8);
  return [
    input.symbol.toUpperCase(),
    input.timeframe,
    input.direction,
    round(input.entry),
    round(input.stopLoss),
  ].join("|");
}

/**
 * Price extremes over the candles that lie entirely after `sinceSeconds`.
 *
 * The bar straddling that moment is deliberately excluded: part of it happened
 * before the setup was recorded, and resolving a setup on price action that
 * predates it would report a result the plan never actually produced. Returns
 * null when no complete bar has formed yet, which keeps the setup open.
 */
export function priceWindowSince(
  candles: readonly { time: number; high: number; low: number }[],
  sinceSeconds: number,
): PriceWindow | null {
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;
  let seen = 0;
  for (const candle of candles) {
    if (candle.time < sinceSeconds) continue;
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
    seen++;
  }
  return seen === 0 ? null : { high, low };
}

export function isSetupOutcome(value: unknown): value is SetupOutcome {
  return (
    value === "OPEN" || value === "TARGET_HIT" || value === "STOPPED_OUT" || value === "CANCELED"
  );
}

export interface JournalStats {
  total: number;
  open: number;
  wins: number;
  losses: number;
  /** Share of resolved setups that reached target, 0-100. Null when none closed. */
  winRate: number | null;
}

export function summarizeJournal(outcomes: readonly SetupOutcome[]): JournalStats {
  const wins = outcomes.filter((outcome) => outcome === "TARGET_HIT").length;
  const losses = outcomes.filter((outcome) => outcome === "STOPPED_OUT").length;
  const open = outcomes.filter((outcome) => outcome === "OPEN").length;
  const resolved = wins + losses;
  return {
    total: outcomes.length,
    open,
    wins,
    losses,
    winRate: resolved === 0 ? null : Math.round((wins / resolved) * 100),
  };
}
