"use client";

import { useEffect, useRef, useState } from "react";
import { buildAnalysisResult } from "@/core/domain/analysis/analysis-engine";
import type { AnalysisResult, Candle, MarketTicker, Timeframe } from "@/core/domain/models";
import { binanceMarketData } from "@/infrastructure/market-data/binance-client";
import {
  subscribeBinanceMarket,
  type BinanceStreamStatus,
} from "@/infrastructure/market-data/binance-stream-client";
import { browserSetupLockStore } from "@/infrastructure/persistence/browser-setup-lock-store";

export const FALLBACK_POLL_MS = 4_000;

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

export function useLiveAnalysis(
  symbol: string,
  timeframe: Timeframe,
): {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  streamStatus: BinanceStreamStatus;
} {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<BinanceStreamStatus>("connecting");
  const candlesRef = useRef<Candle[]>([]);
  const tickerRef = useRef<MarketTicker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let controller: AbortController | undefined;
    let unsubscribe: (() => void) | undefined;
    candlesRef.current = [];
    tickerRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setStreamStatus("connecting");

    function publish() {
      const ticker = tickerRef.current;
      const candles = candlesRef.current;
      if (!ticker || candles.length === 0 || cancelled) return;
      const base = symbol.replace(/USDT$/, "") || symbol;
      setAnalysis(buildAnalysisResult(
        symbol,
        base,
        "USDT",
        timeframe,
        "Binance",
        candles,
        ticker,
        browserSetupLockStore,
      ));
      setError(null);
    }

    async function load(full: boolean) {
      controller = new AbortController();
      try {
        const [ticker, latest] = await Promise.all([
          binanceMarketData.fetchTicker24h(symbol, controller.signal),
          binanceMarketData.fetchKlines(symbol, timeframe, full ? 100 : 2, controller.signal),
        ]);
        if (cancelled) return;
        candlesRef.current = full ? latest : mergeCandles(candlesRef.current, latest);
        tickerRef.current = ticker;
        publish();
      } catch (caught) {
        if (cancelled || controller.signal.aborted) return;
        if (candlesRef.current.length === 0) {
          setAnalysis(null);
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

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
      unsubscribe?.();
      if (timer) clearInterval(timer);
    };
  }, [symbol, timeframe]);

  return { analysis, loading, error, streamStatus };
}
