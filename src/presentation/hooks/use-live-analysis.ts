"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildAnalysisResult } from "@/core/domain/analysis/analysis-engine";
import type { AnalysisResult, Candle, MarketTicker, Timeframe } from "@/core/domain/models";
import { binanceMarketData } from "@/infrastructure/market-data/binance-client";
import {
  subscribeBinanceMarket,
  type BinanceStreamStatus,
} from "@/infrastructure/market-data/binance-stream-client";
import { browserSetupLockStore } from "@/infrastructure/persistence/browser-setup-lock-store";

export const FALLBACK_POLL_MS = 4_000;
export const HISTORY_PAGE_SIZE = 1_000;
const ANALYSIS_WINDOW_SIZE = 1_000;

function mergeCandles(previous: Candle[], latest: Candle[]): Candle[] {
  if (latest.length === 0) return previous;
  if (previous.length === 0) return latest;
  const next = [...previous];
  const fresh = latest.at(-1)!;
  const existing = next.at(-1)!;
  if (existing.time === fresh.time) next[next.length - 1] = fresh;
  else next.push(fresh);
  return next;
}

export function prependCandleHistory(previous: Candle[], older: Candle[]): Candle[] {
  if (older.length === 0) return previous;
  const known = new Set(previous.map((candle) => candle.time));
  return [...older.filter((candle) => !known.has(candle.time)), ...previous]
    .sort((a, b) => a.time - b.time);
}

export function useLiveAnalysis(
  symbol: string,
  timeframe: Timeframe,
): {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  streamStatus: BinanceStreamStatus;
  historyLoading: boolean;
  hasMoreHistory: boolean;
  loadMoreHistory: () => Promise<void>;
} {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<BinanceStreamStatus>("connecting");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const candlesRef = useRef<Candle[]>([]);
  const tickerRef = useRef<MarketTicker | null>(null);
  const loadMoreRef = useRef<() => Promise<void>>(async () => undefined);
  const loadMoreHistory = useCallback(() => loadMoreRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let controller: AbortController | undefined;
    let historyController: AbortController | undefined;
    let unsubscribe: (() => void) | undefined;
    let loadingOlder = false;
    let canLoadMore = true;
    candlesRef.current = [];
    tickerRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setStreamStatus("connecting");
    setHistoryLoading(false);
    setHasMoreHistory(true);

    function publish() {
      const ticker = tickerRef.current;
      const candles = candlesRef.current;
      if (!ticker || candles.length === 0 || cancelled) return;
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
      setAnalysis({
        ...result,
        chartData: { ...result.chartData, candles },
      });
      setError(null);
    }

    async function load(full: boolean) {
      const requestController = new AbortController();
      controller = requestController;
      try {
        const [ticker, latest] = await Promise.all([
          binanceMarketData.fetchTicker24h(symbol, requestController.signal),
          binanceMarketData.fetchKlines(
            symbol,
            timeframe,
            full ? HISTORY_PAGE_SIZE : 2,
            requestController.signal,
          ),
        ]);
        if (cancelled) return;
        candlesRef.current = full ? latest : mergeCandles(candlesRef.current, latest);
        if (full) {
          canLoadMore = latest.length === HISTORY_PAGE_SIZE;
          setHasMoreHistory(canLoadMore);
        }
        tickerRef.current = ticker;
        publish();
      } catch (caught) {
        if (cancelled || requestController.signal.aborted) return;
        if (candlesRef.current.length === 0) {
          setAnalysis(null);
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMoreRef.current = async () => {
      const oldest = candlesRef.current[0];
      if (!oldest || loadingOlder || !canLoadMore || cancelled) return;
      loadingOlder = true;
      setHistoryLoading(true);
      historyController = new AbortController();
      try {
        const older = await binanceMarketData.fetchKlines(
          symbol,
          timeframe,
          HISTORY_PAGE_SIZE,
          historyController.signal,
          oldest.time * 1_000 - 1,
        );
        if (cancelled) return;
        candlesRef.current = prependCandleHistory(candlesRef.current, older);
        canLoadMore = older.length === HISTORY_PAGE_SIZE;
        setHasMoreHistory(canLoadMore);
        publish();
      } catch (caught) {
        if (!cancelled && !historyController.signal.aborted) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        loadingOlder = false;
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void load(true).then(() => {
      if (cancelled || candlesRef.current.length === 0) return;
      unsubscribe = subscribeBinanceMarket(
        symbol,
        timeframe,
        (update) => {
          if (update.candle) candlesRef.current = mergeCandles(candlesRef.current, [update.candle]);
          if (update.ticker) tickerRef.current = update.ticker;
          publish();
        },
        (status) => {
          if (!cancelled) setStreamStatus(status);
        },
      );
      timer = setInterval(() => void load(false), FALLBACK_POLL_MS);
    });
    return () => {
      cancelled = true;
      controller?.abort();
      historyController?.abort();
      unsubscribe?.();
      if (timer) clearInterval(timer);
      loadMoreRef.current = async () => undefined;
    };
  }, [symbol, timeframe]);

  return {
    analysis,
    loading,
    error,
    streamStatus,
    historyLoading,
    hasMoreHistory,
    loadMoreHistory,
  };
}
