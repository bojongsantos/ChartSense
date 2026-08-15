"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalysisResult,
  Candle,
  MarketContext,
  ScannerOpportunity,
  SentimentData,
  Timeframe,
} from "./types";
import { fetchKlines, fetchTicker24h } from "./binance";
import { buildAnalysisResult } from "./analysis-engine";
import { runScanner } from "./scanner-engine";
import { runSdScan, getTopSetups, type SdScanResult, type TopSetup } from "./sd-recommendations";
import { formatCompact } from "./format";
import { readCache, writeCache } from "./ctx-cache";

export const POLL_MS = 4000;

const FUNDING_TTL = 5 * 60_000;
const OI_TTL = 60_000;
const DOMINANCE_TTL = 5 * 60_000;

export interface FundingRateData {
  ratePct: number;
  lastFundingTime: number;
}

export interface OpenInterestData {
  usdValue: number;
  btcValue: number;
}

export interface DominanceData {
  pct: number;
  change24h: number;
}

async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T | null> {
  const cached = readCache<T>(key, ttlMs);
  if (cached !== null) return cached;
  try {
    const data = await fetcher();
    writeCache(key, data);
    return data;
  } catch (err) {
    console.error(`[market-context] ${key} fetch failed:`, err);
    return null;
  }
}

async function safeFetch<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[market-context] ${key} fetch failed:`, err);
    return null;
  }
}

async function fetchFearGreed(): Promise<{ value: string; value_classification?: string } | undefined> {
  try {
    const res = await fetch("https://api.alternative.me/fng/", { cache: "no-store" });
    const j = (await res.json()) as { data?: { value?: string; value_classification?: string }[] };
    return j.data?.[0];
  } catch {
    return undefined;
  }
}

function fngLabel(cls: string | undefined): string {
  switch (cls) {
    case "Extreme Fear":
    case "Fear":
    case "Neutral":
    case "Greed":
    case "Extreme Greed":
      return cls;
    default:
      return "—";
  }
}

function fngTone(cls: string | undefined): "positive" | "negative" | undefined {
  if (cls === "Extreme Fear" || cls === "Fear") return "negative";
  if (cls === "Greed" || cls === "Extreme Greed") return "positive";
  return undefined;
}

export async function fetchFundingRate(symbol = "BTCUSDT"): Promise<FundingRateData | null> {
  return cachedFetch("funding-rate", FUNDING_TTL, async () => {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { lastFundingRate?: string; lastFundingTime?: number };
    const rate = parseFloat(j.lastFundingRate ?? "");
    if (!Number.isFinite(rate)) throw new Error("missing lastFundingRate");
    return { ratePct: rate * 100, lastFundingTime: j.lastFundingTime ?? Date.now() };
  });
}

export async function fetchOpenInterest(symbol = "BTCUSDT"): Promise<OpenInterestData | null> {
  return cachedFetch("open-interest", OI_TTL, async () => {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { openInterest?: string };
    const btcValue = parseFloat(j.openInterest ?? "");
    if (!Number.isFinite(btcValue)) throw new Error("missing openInterest");
    const ticker = await fetchTicker24h(symbol);
    return { btcValue, usdValue: btcValue * ticker.lastPrice };
  });
}

export async function fetchDominance(): Promise<DominanceData | null> {
  return cachedFetch("btc-dominance", DOMINANCE_TTL, async () => {
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as {
      data?: { market_cap_percentage?: { btc?: number }; market_cap_change_percentage_24h_usd?: number };
    };
    const pct = j.data?.market_cap_percentage?.btc;
    if (typeof pct !== "number" || !Number.isFinite(pct)) throw new Error("missing market_cap_percentage.btc");
    return { pct, change24h: j.data?.market_cap_change_percentage_24h_usd ?? 0 };
  });
}

function formatFunding(ratePct: number): string {
  return `${ratePct.toFixed(4)}%`;
}

function formatOiUsd(usdValue: number): string {
  const billions = usdValue / 1e9;
  return `$${billions >= 100 ? billions.toFixed(0) : billions.toFixed(1)}B`;
}

function mergeCandles(prev: Candle[], latest: Candle[]): Candle[] {
  if (prev.length === 0) return latest;
  const next = [...prev];
  const fresh = latest[latest.length - 1];
  const existing = next[next.length - 1];
  if (existing.time === fresh.time) {
    next[next.length - 1] = fresh;
  } else {
    next.push(fresh);
  }
  return next;
}

export function useLiveAnalysis(symbol: string, timeframe: Timeframe): {
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
} {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  const load = useCallback(
    async (full: boolean) => {
      if (full) setLoading(true);
      try {
        const ticker = await fetchTicker24h(symbol);
        const latest = await fetchKlines(symbol, timeframe, full ? 100 : 2);
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
        );
        setAnalysis(result);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [symbol, timeframe],
  );

  useEffect(() => {
    candlesRef.current = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
    const id = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { analysis, loading, error };
}

export function useScanner(): {
  opportunities: ScannerOpportunity[];
  loading: boolean;
  error: string | null;
  lastRun: string | null;
  refresh: () => void;
} {
  const [opportunities, setOpportunities] = useState<ScannerOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {      const result = await runScanner();
      setOpportunities(result.opportunities);
      setError(result.errors.length ? result.errors.join("; ") : null);
      setLastRun(result.scannedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { opportunities, loading, error, lastRun, refresh };
}

export function useSdScan(enabled = true): {
  result: SdScanResult | null;
  loading: boolean;
  error: string | null;
  lastRun: string | null;
  refresh: () => void;
} {
  const [result, setResult] = useState<SdScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runSdScan();
      setResult(res);
      setError(res.errors.length ? `${res.errors.length} simbol gagal discan.` : null);
      setLastRun(res.scannedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh, enabled]);

  return { result, loading, error, lastRun, refresh };
}

export function useTopSetups(limit = 5): {
  top: TopSetup[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [top, setTop] = useState<TopSetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTopSetups(limit);
      setTop(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { top, loading, error, refresh };
}

export function useMarketContext(): { context: MarketContext | null } {
  const [context, setContext] = useState<MarketContext | null>(null);

  const load = useCallback(async () => {
    const [btc, eth, fng, funding, oi, dominance] = await Promise.all([
      safeFetch("btc-ticker", () => fetchTicker24h("BTCUSDT")),
      safeFetch("eth-ticker", () => fetchTicker24h("ETHUSDT")),
      fetchFearGreed(),
      fetchFundingRate(),
      fetchOpenInterest(),
      fetchDominance(),
    ]);
    if (!btc || !eth) {
      setContext(null);
      return;
    }
    const ctx: MarketContext = {
        btc: {
          id: "btc",
          label: "BTC",
          value: formatCompact(btc.lastPrice),
          change: btc.priceChangePercent,
          direction: btc.priceChangePercent >= 0 ? "up" : "down",
        },
        eth: {
          id: "eth",
          label: "ETH",
          value: formatCompact(eth.lastPrice),
          change: eth.priceChangePercent,
          direction: eth.priceChangePercent >= 0 ? "up" : "down",
        },
        dominance: {
          id: "dom",
          label: "BTC Dominance",
          value: dominance ? `${dominance.pct.toFixed(2)}%` : "—",
          change: dominance?.change24h ?? 0,
          direction: !dominance || dominance.change24h === 0 ? "flat" : dominance.change24h > 0 ? "up" : "down",
          hint: "24h change",
          warning: !dominance,
        },
        fundingRate: {
          id: "funding",
          label: "Funding Rate",
          value: funding ? formatFunding(funding.ratePct) : "—",
          change: funding?.ratePct ?? 0,
          direction: !funding || funding.ratePct === 0 ? "flat" : funding.ratePct > 0 ? "up" : "down",
          hint: "BTC perp · 8h",
          tone: funding ? (funding.ratePct >= 0 ? "positive" : "negative") : undefined,
          warning: !funding,
          hideDelta: true,
        },
        openInterest: {
          id: "oi",
          label: "Open Interest",
          value: oi ? formatOiUsd(oi.usdValue) : "—",
          change: 0,
          direction: "flat",
          hint: "BTC futures",
          warning: !oi,
          hideDelta: true,
        },
        volume: {
          id: "vol",
          label: "Fear & Greed",
          value: fng ? `${fngLabel(fng.value_classification)} · ${fng.value}/100` : "—",
          change: 0,
          direction: "flat",
          tone: fng ? fngTone(fng.value_classification) : undefined,
          warning: !fng,
          hideDelta: true,
        },
      };
      setContext(ctx);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  return { context };
}

export function useSentiment(): { sentiment: SentimentData | null } {
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("https://api.alternative.me/fng/", { cache: "no-store" });
        const j = await res.json();
        const value = parseInt(j.data?.[0]?.value, 10) || 50;
        if (!cancelled) {
          const label = value <= 20 ? "Extreme Fear" : value <= 40 ? "Fear" : value < 60 ? "Neutral" : value < 80 ? "Greed" : "Extreme Greed";
          setSentiment({
            score: value,
            label,
            distribution: [
              { label: "Extreme Fear", value: Math.max(4, 50 - value) },
              { label: "Fear", value: Math.max(8, 100 - value - 40) },
              { label: "Neutral", value: Math.max(10, Math.abs(50 - value)) },
              { label: "Greed", value: Math.max(8, value) },
              { label: "Extreme Greed", value: Math.max(4, value - 50) },
            ],
          });
        }
      } catch {
        if (!cancelled) setSentiment(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { sentiment };
}
