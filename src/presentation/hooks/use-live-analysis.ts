"use client";

import { useEffect, useRef, useState } from "react";
import { buildAnalysisResult } from "@/core/domain/analysis/analysis-engine";
import type { AnalysisResult, Candle, Timeframe } from "@/core/domain/models";
import { binanceMarketData } from "@/infrastructure/market-data/binance-client";
import { browserSetupLockStore } from "@/infrastructure/persistence/browser-setup-lock-store";

export const POLL_MS = 4_000;

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
} {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    candlesRef.current = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalysis(null);
    setError(null);
    setLoading(true);

    async function load(full: boolean) {
      controller = new AbortController();
      try {
        const [ticker, latest] = await Promise.all([
          binanceMarketData.fetchTicker24h(symbol, controller.signal),
          binanceMarketData.fetchKlines(symbol, timeframe, full ? 100 : 2, controller.signal),
        ]);
        if (cancelled) return;
        const candles = full ? latest : mergeCandles(candlesRef.current, latest);
        candlesRef.current = candles;
        const base = symbol.replace(/USDT$/, "") || symbol;
        const result = buildAnalysisResult(
          symbol,
          base,
          "USDT",
          timeframe,
          "Binance",
          candles,
          ticker,
          browserSetupLockStore,
        );
        if (cancelled) return;
        setAnalysis(result);
        setError(null);
      } catch (caught) {
        if (cancelled || controller.signal.aborted) return;
        setAnalysis(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(() => load(false), POLL_MS);
        }
      }
    }

    void load(true);
    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, [symbol, timeframe]);

  return { analysis, loading, error };
}
