import type { MarketDataPort } from "@/core/application/ports/market-data-port";
import type { Candle, MarketTicker, Timeframe } from "@/core/domain/models";

export const BINANCE_BASE = "https://data-api.binance.vision";

export const INTERVAL_BY_TIMEFRAME: Record<Timeframe, string> = {
  "15m": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
};

export const STEP_BY_TIMEFRAME: Record<Timeframe, number> = {
  "15m": 900,
  "1H": 3_600,
  "4H": 14_400,
  "1D": 86_400,
};

export const KLINE_LIMIT_BY_TIMEFRAME: Record<Timeframe, number> = {
  "15m": 100,
  "1H": 100,
  "4H": 100,
  "1D": 100,
};

const REQUEST_TIMEOUT_MS = 8_000;
const RETRY_DELAYS_MS = [250, 750];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const res = await fetch(`${BINANCE_BASE}${path}`, { cache: "no-store", signal: combined });
      if (!res.ok) {
        const error = new Error(`Binance API ${res.status}: ${res.statusText}`);
        if (res.status !== 429 && res.status < 500) throw error;
        lastError = error;
      } else {
        return (await res.json()) as T;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt], signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Binance request failed");
}

function finiteNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid Binance field: ${field}`);
  return parsed;
}

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = KLINE_LIMIT_BY_TIMEFRAME[timeframe],
  signal?: AbortSignal,
): Promise<Candle[]> {
  const interval = INTERVAL_BY_TIMEFRAME[timeframe];
  const raw = await request<[number, string, string, string, string, string][]>(
    `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`,
    signal,
  );
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`No candle data for ${symbol}`);
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: finiteNumber(k[1], "open"),
    high: finiteNumber(k[2], "high"),
    low: finiteNumber(k[3], "low"),
    close: finiteNumber(k[4], "close"),
    volume: finiteNumber(k[5], "volume"),
  }));
}

export async function fetchTicker24h(symbol: string, signal?: AbortSignal): Promise<MarketTicker> {
  const t = await request<Record<string, string>>(
    `/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`,
    signal,
  );
  return {
    symbol: t.symbol,
    lastPrice: finiteNumber(t.lastPrice, "lastPrice"),
    priceChange: finiteNumber(t.priceChange, "priceChange"),
    priceChangePercent: finiteNumber(t.priceChangePercent, "priceChangePercent"),
    highPrice: finiteNumber(t.highPrice, "highPrice"),
    lowPrice: finiteNumber(t.lowPrice, "lowPrice"),
    quoteVolume: finiteNumber(t.quoteVolume, "quoteVolume"),
    volume: finiteNumber(t.volume, "volume"),
  };
}

export async function fetchTickers24h(symbols: string[]): Promise<MarketTicker[]> {
  if (symbols.length === 0) return [];
  // Binance caps the number of symbols per request; chunk large lists.
  const chunk = 80;
  const out: MarketTicker[] = [];
  for (let i = 0; i < symbols.length; i += chunk) {
    const slice = symbols.slice(i, i + chunk);
    const symbolParam = slice.map((s) => `"${s}"`).join(",");
    const list = await request<Record<string, string>[]>(`/api/v3/ticker/24hr?symbols=[${symbolParam}]`);
    out.push(
      ...list.map((t) => ({
        symbol: t.symbol,
        lastPrice: finiteNumber(t.lastPrice, "lastPrice"),
        priceChange: finiteNumber(t.priceChange, "priceChange"),
        priceChangePercent: finiteNumber(t.priceChangePercent, "priceChangePercent"),
        highPrice: finiteNumber(t.highPrice, "highPrice"),
        lowPrice: finiteNumber(t.lowPrice, "lowPrice"),
        quoteVolume: finiteNumber(t.quoteVolume, "quoteVolume"),
        volume: finiteNumber(t.volume, "volume"),
      })),
    );
  }
  return out;
}

export const binanceMarketData: MarketDataPort = {
  fetchKlines,
  fetchTicker24h,
  fetchTickers24h,
};
