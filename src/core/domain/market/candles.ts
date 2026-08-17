import type { Candle } from "@/core/domain/models";

/**
 * Merges candle batches into a single ascending, duplicate-free series.
 * Later batches win on conflict, so live data always overrides the historical
 * copy of the same bar.
 */
export function mergeCandleSeries(...batches: readonly (readonly Candle[])[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const batch of batches) {
    for (const candle of batch) byTime.set(candle.time, candle);
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

/**
 * Replaces the tail of a series with a freshly fetched batch of recent bars.
 *
 * Used for the REST poll, whose response is authoritative for every bar it
 * covers — including the one that closed since the last poll, which a
 * tail-only update would leave holding a stale close. Bars older than the
 * batch are left untouched, so this costs one pass rather than a re-sort of
 * a series that may hold hundreds of thousands of candles.
 */
export function applyRecentCandles(
  series: readonly Candle[],
  recent: readonly Candle[],
): Candle[] {
  if (recent.length === 0) return series.slice();
  const oldest = recent[0].time;
  let cut = series.length;
  while (cut > 0 && series[cut - 1].time >= oldest) cut--;
  return [...series.slice(0, cut), ...recent];
}

/**
 * Applies a live update to the tail of a series: it either refreshes the bar
 * still forming or starts the next one. An update older than the last bar is
 * ignored so a late websocket frame cannot rewrite settled history.
 */
export function upsertLatestCandle(series: readonly Candle[], latest: Candle): Candle[] {
  if (series.length === 0) return [latest];
  const last = series[series.length - 1];
  if (latest.time < last.time) return series.slice();
  if (latest.time === last.time) {
    const next = series.slice();
    next[next.length - 1] = latest;
    return next;
  }
  return [...series, latest];
}
