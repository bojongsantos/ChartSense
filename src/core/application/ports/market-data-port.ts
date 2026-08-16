import type { Candle, MarketTicker, Timeframe } from "@/core/domain/models";

export interface MarketDataPort {
  fetchKlines(symbol: string, timeframe: Timeframe, limit?: number, signal?: AbortSignal): Promise<Candle[]>;
  fetchTicker24h(symbol: string, signal?: AbortSignal): Promise<MarketTicker>;
  fetchTickers24h(symbols: string[]): Promise<MarketTicker[]>;
}
