"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchListingTime,
  loadHistory,
  HISTORY_PAGE_SIZE,
  type HistoryProgress,
} from "@/core/application/market-data/history-loader";
import {
  estimateRangeCandles,
  type HistoryRange,
} from "@/core/application/market-data/history-plan";
import { buildAnalysisResult } from "@/core/domain/analysis/analysis-engine";
import {
  applyRecentCandles,
  mergeCandleSeries,
  upsertLatestCandle,
} from "@/core/domain/market/candles";
import type { AnalysisResult, Candle, MarketTicker, Timeframe } from "@/core/domain/models";
import { marketData } from "@/infrastructure/market-data/market-data-provider";
import {
  subscribeBinanceMarket,
  type BinanceStreamStatus,
} from "@/infrastructure/market-data/binance-stream-client";
import { browserSetupLockStore } from "@/infrastructure/persistence/browser-setup-lock-store";

export const FALLBACK_POLL_MS = 4_000;

/** Candles fed to the analysis engine. Older bars are for the chart only. */
const ANALYSIS_WINDOW_SIZE = 1_000;

/** Minimum gap between chart repaints while history streams in. */
const PUBLISH_THROTTLE_MS = 150;

export interface HistoryState {
  loading: boolean;
  progress: HistoryProgress | null;
  /** The candle budget stopped the load short of the requested range. */
  truncated: boolean;
  /** The oldest loaded candle is the first this market ever printed. */
  reachedStart: boolean;
}

export interface LiveAnalysis {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  streamStatus: BinanceStreamStatus;
  history: HistoryState;
  loadMoreHistory: () => Promise<void>;
}

export function useLiveAnalysis(
  symbol: string,
  timeframe: Timeframe,
  range: HistoryRange,
): LiveAnalysis {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<BinanceStreamStatus>("connecting");
  const [history, setHistory] = useState<HistoryState>({
    loading: false,
    progress: null,
    truncated: false,
    reachedStart: false,
  });

  const loadMoreRef = useRef<() => Promise<void>>(async () => undefined);
  const loadMoreHistory = useCallback(() => loadMoreRef.current(), []);

  // Switching symbol, timeframe or range starts a different chart entirely.
  // Resetting while rendering (React's documented "adjust state when a prop
  // changes" pattern) clears the previous market in the same commit, so the
  // old candles never flash under the new header.
  const viewKey = `${symbol}|${timeframe}|${range}`;
  const [renderedKey, setRenderedKey] = useState(viewKey);
  if (viewKey !== renderedKey) {
    setRenderedKey(viewKey);
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setStreamStatus("connecting");
    setHistory({ loading: true, progress: null, truncated: false, reachedStart: false });
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let publishTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    let candles: Candle[] = [];
    let ticker: MarketTicker | null = null;
    let listingSeconds: number | null = null;
    let lastPublishedAt = 0;
    let extending = false;
    let exhausted = false;

    function reachedStart(): boolean {
      return (
        exhausted ||
        (listingSeconds !== null && candles.length > 0 && candles[0].time <= listingSeconds)
      );
    }

    function render() {
      if (cancelled || !ticker || candles.length === 0) return;
      lastPublishedAt = Date.now();
      const base = symbol.replace(/USDT$/, "") || symbol;
      const result = buildAnalysisResult(
        symbol,
        base,
        "USDT",
        timeframe,
        "Binance",
        candles.slice(-ANALYSIS_WINDOW_SIZE),
        ticker,
        browserSetupLockStore,
      );
      setAnalysis({ ...result, chartData: { ...result.chartData, candles } });
      setError(null);
    }

    /** Repaints at most once per throttle window, never dropping the last frame. */
    function publish() {
      if (cancelled) return;
      const elapsed = Date.now() - lastPublishedAt;
      if (elapsed >= PUBLISH_THROTTLE_MS) {
        if (publishTimer) {
          clearTimeout(publishTimer);
          publishTimer = undefined;
        }
        render();
        return;
      }
      if (publishTimer) return;
      publishTimer = setTimeout(() => {
        publishTimer = undefined;
        render();
      }, PUBLISH_THROTTLE_MS - elapsed);
    }

    function fail(caught: unknown) {
      if (cancelled || controller.signal.aborted) return;
      if (candles.length === 0) {
        setAnalysis(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    }

    /** Phase one: the newest window, so the chart is usable immediately. */
    async function loadRecent() {
      // Ask for the selected range, not a fixed page, so a short range never
      // arrives padded with history the user did not ask to see.
      const wanted = estimateRangeCandles(range, timeframe);
      const recentLimit = Math.min(HISTORY_PAGE_SIZE, wanted ?? HISTORY_PAGE_SIZE);
      try {
        const [latestTicker, latestCandles] = await Promise.all([
          marketData.fetchTicker24h(symbol, controller.signal),
          marketData.fetchKlines({
            symbol,
            timeframe,
            limit: recentLimit,
            signal: controller.signal,
          }),
        ]);
        if (cancelled) return;
        candles = latestCandles;
        ticker = latestTicker;
        render();
      } catch (caught) {
        fail(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    /** Phase two: backfill the selected range behind the newest window. */
    async function loadRange() {
      try {
        listingSeconds = await fetchListingTime(marketData, symbol, timeframe, controller.signal);
      } catch {
        listingSeconds = null;
      }
      if (cancelled) return;

      try {
        const loaded = await loadHistory({
          marketData,
          symbol,
          timeframe,
          range,
          nowSeconds: Math.floor(Date.now() / 1_000),
          listingSeconds,
          signal: controller.signal,
          onProgress: (progress) => {
            if (!cancelled) setHistory((prev) => ({ ...prev, progress }));
          },
          onPartial: (older) => {
            if (cancelled) return;
            candles = mergeCandleSeries(older, candles);
            publish();
          },
        });
        if (cancelled) return;
        candles = mergeCandleSeries(loaded.candles, candles);
        setHistory({
          loading: false,
          progress: null,
          truncated: loaded.truncated,
          reachedStart: reachedStart(),
        });
        publish();
      } catch (caught) {
        if (cancelled) return;
        setHistory((prev) => ({ ...prev, loading: false }));
        fail(caught);
      }
    }

    /** Cheap poll that keeps the last bar fresh when the socket is down. */
    async function pollLatest() {
      try {
        const [latestTicker, latest] = await Promise.all([
          marketData.fetchTicker24h(symbol, controller.signal),
          marketData.fetchKlines({ symbol, timeframe, limit: 2, signal: controller.signal }),
        ]);
        if (cancelled) return;
        ticker = latestTicker;
        candles = applyRecentCandles(candles, latest);
        publish();
      } catch (caught) {
        fail(caught);
      }
    }

    /** Scroll-triggered paging further back than the loaded window. */
    loadMoreRef.current = async () => {
      if (cancelled || extending || exhausted || candles.length === 0) return;
      extending = true;
      setHistory((prev) => ({ ...prev, loading: true }));
      try {
        const older = await marketData.fetchKlines({
          symbol,
          timeframe,
          limit: HISTORY_PAGE_SIZE,
          endTime: candles[0].time * 1_000 - 1,
          signal: controller.signal,
        });
        if (cancelled) return;
        if (older.length === 0) exhausted = true;
        candles = mergeCandleSeries(older, candles);
        publish();
      } catch (caught) {
        fail(caught);
      } finally {
        extending = false;
        if (!cancelled) {
          setHistory((prev) => ({ ...prev, loading: false, reachedStart: reachedStart() }));
        }
      }
    };

    void loadRecent().then(async () => {
      // Nothing loaded means the symbol failed outright; clear the history
      // spinner instead of leaving it running behind the error.
      if (cancelled || candles.length === 0) {
        if (!cancelled) setHistory((prev) => ({ ...prev, loading: false }));
        return;
      }
      unsubscribe = subscribeBinanceMarket(
        symbol,
        timeframe,
        (update) => {
          if (cancelled) return;
          if (update.candle) candles = upsertLatestCandle(candles, update.candle);
          if (update.ticker) ticker = update.ticker;
          publish();
        },
        (status) => {
          if (!cancelled) setStreamStatus(status);
        },
      );
      pollTimer = setInterval(() => void pollLatest(), FALLBACK_POLL_MS);
      await loadRange();
    });

    return () => {
      cancelled = true;
      controller.abort();
      unsubscribe?.();
      if (pollTimer) clearInterval(pollTimer);
      if (publishTimer) clearTimeout(publishTimer);
      loadMoreRef.current = async () => undefined;
    };
  }, [symbol, timeframe, range]);

  return { analysis, loading, error, streamStatus, history, loadMoreHistory };
}
