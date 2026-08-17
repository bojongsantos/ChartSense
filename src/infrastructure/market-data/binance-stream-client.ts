import type { Candle, MarketTicker, Timeframe } from "@/core/domain/models";
import { INTERVAL_BY_TIMEFRAME } from "@/infrastructure/market-data/binance-client";

export type BinanceStreamStatus = "connecting" | "live" | "fallback";

export interface BinanceStreamUpdate {
  symbol: string;
  candle?: Candle;
  ticker?: MarketTicker;
}

function number(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBinanceStreamMessage(raw: string): BinanceStreamUpdate | null {
  try {
    const envelope = JSON.parse(raw) as { data?: Record<string, unknown> };
    const data = envelope.data ?? (envelope as Record<string, unknown>);

    if (data.e === "kline") {
      const kline = data.k as Record<string, unknown> | undefined;
      const time = number(kline?.t);
      const open = number(kline?.o);
      const high = number(kline?.h);
      const low = number(kline?.l);
      const close = number(kline?.c);
      const volume = number(kline?.v);
      if ([time, open, high, low, close, volume].some((value) => value === null)) return null;
      return {
        symbol: String(kline?.s ?? data.s ?? ""),
        candle: {
          time: Math.floor(time! / 1000),
          open: open!,
          high: high!,
          low: low!,
          close: close!,
          volume: volume!,
        },
      };
    }

    if (data.e === "24hrTicker") {
      const lastPrice = number(data.c);
      const priceChange = number(data.p);
      const priceChangePercent = number(data.P);
      const highPrice = number(data.h);
      const lowPrice = number(data.l);
      const quoteVolume = number(data.q);
      const volume = number(data.v);
      if ([lastPrice, priceChange, priceChangePercent, highPrice, lowPrice, quoteVolume, volume]
        .some((value) => value === null)) return null;
      return {
        symbol: String(data.s ?? ""),
        ticker: {
          symbol: String(data.s ?? ""),
          lastPrice: lastPrice!,
          priceChange: priceChange!,
          priceChangePercent: priceChangePercent!,
          highPrice: highPrice!,
          lowPrice: lowPrice!,
          quoteVolume: quoteVolume!,
          volume: volume!,
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function subscribeBinanceMarket(
  symbol: string,
  timeframe: Timeframe,
  onUpdate: (update: BinanceStreamUpdate) => void,
  onStatus: (status: BinanceStreamStatus) => void,
): () => void {
  return subscribeBinanceMarkets([symbol], timeframe, onUpdate, onStatus);
}

export function subscribeBinanceMarkets(
  symbols: string[],
  timeframe: Timeframe,
  onUpdate: (update: BinanceStreamUpdate) => void,
  onStatus: (status: BinanceStreamStatus) => void,
): () => void {
  let stopped = false;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  const normalized = [...new Set(symbols)]
    .filter((symbol) => /^[A-Z0-9]{4,20}$/.test(symbol))
    .map((symbol) => symbol.toLowerCase());
  const streams = normalized
    .flatMap((symbol) => [`${symbol}@kline_${INTERVAL_BY_TIMEFRAME[timeframe]}`, `${symbol}@ticker`])
    .join("/");

  if (!streams) {
    onStatus("fallback");
    return () => undefined;
  }

  const connect = () => {
    if (stopped) return;
    onStatus("connecting");
    socket = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${streams}`);
    socket.addEventListener("open", () => onStatus("live"));
    socket.addEventListener("message", (event) => {
      if (stopped || typeof event.data !== "string") return;
      const update = parseBinanceStreamMessage(event.data);
      if (update) onUpdate(update);
    });
    socket.addEventListener("close", () => {
      if (stopped) return;
      onStatus("fallback");
      reconnectTimer = setTimeout(connect, 3_000);
    });
    socket.addEventListener("error", () => socket?.close());
  };

  connect();
  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
