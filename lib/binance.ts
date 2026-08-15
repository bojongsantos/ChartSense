import type { Candle, Timeframe } from "./types";

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

export interface BinanceKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BinanceTicker {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  volume: number;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BINANCE_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Binance API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface KlineRaw {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = KLINE_LIMIT_BY_TIMEFRAME[timeframe],
): Promise<Candle[]> {
  const interval = INTERVAL_BY_TIMEFRAME[timeframe];
  const raw = await request<[number, string, string, string, string, string][]>(
    `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

export async function fetchLatestKline(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  return fetchKlines(symbol, timeframe, 2);
}

export async function fetchTicker24h(symbol: string): Promise<BinanceTicker> {
  const t = await request<Record<string, string>>(`/api/v3/ticker/24hr?symbol=${symbol}`);
  return {
    symbol: t.symbol,
    lastPrice: parseFloat(t.lastPrice),
    priceChange: parseFloat(t.priceChange),
    priceChangePercent: parseFloat(t.priceChangePercent),
    highPrice: parseFloat(t.highPrice),
    lowPrice: parseFloat(t.lowPrice),
    quoteVolume: parseFloat(t.quoteVolume),
    volume: parseFloat(t.volume),
  };
}

export async function fetchTickers24h(symbols: string[]): Promise<BinanceTicker[]> {
  if (symbols.length === 0) return [];
  // Binance caps the number of symbols per request; chunk large lists.
  const chunk = 80;
  const out: BinanceTicker[] = [];
  for (let i = 0; i < symbols.length; i += chunk) {
    const slice = symbols.slice(i, i + chunk);
    const symbolParam = slice.map((s) => `"${s}"`).join(",");
    const list = await request<Record<string, string>[]>(`/api/v3/ticker/24hr?symbols=[${symbolParam}]`);
    out.push(
      ...list.map((t) => ({
        symbol: t.symbol,
        lastPrice: parseFloat(t.lastPrice),
        priceChange: parseFloat(t.priceChange),
        priceChangePercent: parseFloat(t.priceChangePercent),
        highPrice: parseFloat(t.highPrice),
        lowPrice: parseFloat(t.lowPrice),
        quoteVolume: parseFloat(t.quoteVolume),
        volume: parseFloat(t.volume),
      })),
    );
  }
  return out;
}

/**
 * Run an async mapper over a list with bounded concurrency, so scanning a
 * large watchlist (200+ symbols) does not hammer the exchange API at once.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency = 20,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(workers);
  return results;
}

export interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
}

export async function fetchExchangeInfo(symbols?: string[]): Promise<BinanceSymbolInfo[]> {
  const info = await request<{ symbols: Record<string, string>[] }>("/api/v3/exchangeInfo");
  return info.symbols
    .filter((s) => s.status === "TRADING" && (!symbols || symbols.includes(s.symbol)))
    .map((s) => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      baseAssetPrecision: parseInt(s.baseAssetPrecision, 10),
    }));
}
