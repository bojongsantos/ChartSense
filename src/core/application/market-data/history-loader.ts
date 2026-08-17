import type { MarketDataPort } from "@/core/application/ports/market-data-port";
import {
  planHistoryPages,
  resolveRangeStart,
  type HistoryRange,
} from "@/core/application/market-data/history-plan";
import { mergeCandleSeries } from "@/core/domain/market/candles";
import type { Candle, Timeframe } from "@/core/domain/models";
import { mapConcurrent } from "@/shared/lib/async";

/** Exchanges cap klines at 1000 rows per request. */
export const HISTORY_PAGE_SIZE = 1_000;

/** Parallel page requests. Kept modest so the exchange rate limit is respected. */
export const HISTORY_CONCURRENCY = 5;

/**
 * Upper bound on candles held in memory for one chart. Reaching this only
 * happens on intraday lifetime requests for the oldest pairs, and the loader
 * reports it through `truncated` instead of silently trimming.
 */
export const MAX_HISTORY_CANDLES = 300_000;

export interface HistoryProgress {
  loadedPages: number;
  totalPages: number;
  candles: number;
}

export interface HistoryLoad {
  candles: Candle[];
  /** The candle budget clipped the window short of what the range asked for. */
  truncated: boolean;
  /** Earliest second actually covered. */
  fromSeconds: number;
}

/**
 * Time of the very first candle an exchange has for this symbol and timeframe.
 * One cheap request that turns "ALL" from an open-ended walk backwards into a
 * bounded, plannable window.
 */
export async function fetchListingTime(
  marketData: MarketDataPort,
  symbol: string,
  timeframe: Timeframe,
  signal?: AbortSignal,
): Promise<number | null> {
  const first = await marketData.fetchKlines({
    symbol,
    timeframe,
    limit: 1,
    startTime: 0,
    signal,
  });
  return first[0]?.time ?? null;
}

export interface LoadHistoryOptions {
  marketData: MarketDataPort;
  symbol: string;
  timeframe: Timeframe;
  range: HistoryRange;
  nowSeconds: number;
  /** Listing time when known; the range start falls back to the window itself. */
  listingSeconds: number | null;
  signal?: AbortSignal;
  onProgress?: (progress: HistoryProgress) => void;
  /** Receives the merged series as pages land, so the chart fills in live. */
  onPartial?: (candles: Candle[]) => void;
}

/**
 * Loads a full history window by fetching independent pages concurrently.
 *
 * Because every page start is derived from the plan rather than from the
 * previous response, the requests do not form a dependency chain — which is
 * what makes lifetime history practical on 15m as well as 1D.
 */
export async function loadHistory(options: LoadHistoryOptions): Promise<HistoryLoad> {
  const { marketData, symbol, timeframe, range, nowSeconds, listingSeconds, signal } = options;
  // An unknown listing time behaves like "the beginning of time": bounded
  // ranges stay exact, and ALL is left for the candle budget to clamp.
  const plan = planHistoryPages({
    fromSeconds: resolveRangeStart(range, listingSeconds ?? 0, nowSeconds),
    toSeconds: nowSeconds,
    timeframe,
    pageSize: HISTORY_PAGE_SIZE,
    maxCandles: MAX_HISTORY_CANDLES,
  });

  const totalPages = plan.pageStarts.length;
  const batches: Candle[][] = Array.from({ length: totalPages }, () => []);
  const fetched: boolean[] = Array.from({ length: totalPages }, () => false);
  let loadedPages = 0;

  // Newest page first. Each completed page then extends the series further
  // back from the part the user is already looking at, so intermediate states
  // are always one continuous run of time rather than islands with gaps.
  const newestFirst = plan.pageStarts
    .map((startTime, index) => ({ startTime, index }))
    .reverse();

  await mapConcurrent(
    newestFirst,
    async ({ startTime, index }) => {
      const page = await marketData.fetchKlines({
        symbol,
        timeframe,
        limit: HISTORY_PAGE_SIZE,
        startTime,
        signal,
      });
      batches[index] = page;
      fetched[index] = true;
      loadedPages++;
      options.onProgress?.({
        loadedPages,
        totalPages,
        candles: batches.reduce((sum, batch) => sum + batch.length, 0),
      });

      if (!options.onPartial) return;
      const contiguous: Candle[][] = [];
      for (let cursor = totalPages - 1; cursor >= 0 && fetched[cursor]; cursor--) {
        contiguous.unshift(batches[cursor]);
      }
      if (contiguous.length > 0) options.onPartial(mergeCandleSeries(...contiguous));
    },
    HISTORY_CONCURRENCY,
  );

  return {
    candles: mergeCandleSeries(...batches),
    truncated: plan.truncated,
    fromSeconds: plan.fromSeconds,
  };
}
