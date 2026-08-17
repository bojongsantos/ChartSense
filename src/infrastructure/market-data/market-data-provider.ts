import { createFailoverMarketData } from "@/core/application/market-data/failover";
import { binanceMarketData, fetchSpotUsdtSymbols } from "@/infrastructure/market-data/binance-client";
import { bybitMarketData, fetchBybitSpotUsdtSymbols } from "@/infrastructure/market-data/bybit-client";

/**
 * The single market-data entry point for the whole app.
 *
 * Binance stays primary because it is the only source with a public realtime
 * websocket the client can consume directly. Bybit covers the case where
 * Binance is unreachable — rate limiting, an outage, or a region that blocks
 * it — so charts and scans keep working instead of showing an error.
 */
export const marketData = createFailoverMarketData([binanceMarketData, bybitMarketData]);

/**
 * Tradable USDT spot symbols. Falls back to Bybit's board when Binance's
 * exchange info is unavailable, so symbol search never comes back empty.
 */
export async function fetchUsdtSymbolCatalog(): Promise<string[]> {
  try {
    return await fetchSpotUsdtSymbols();
  } catch (error) {
    try {
      return await fetchBybitSpotUsdtSymbols();
    } catch {
      throw error instanceof Error ? error : new Error("Symbol catalog unavailable");
    }
  }
}
