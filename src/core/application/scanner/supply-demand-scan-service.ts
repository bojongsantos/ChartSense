import type { MarketDataPort } from "@/core/application/ports/market-data-port";
import {
  ACTIVE_SETUP_STATUSES,
  detectSupplyDemand,
  type SdResult,
} from "@/core/domain/analysis/supply-demand";
import type { Timeframe } from "@/core/domain/models";
import { mapConcurrent } from "@/shared/lib/async";

export const SD_SCAN_TIMEFRAME: Timeframe = "15m";

export interface SdScanHit {
  symbol: string;
  base: string;
  timeframe: Timeframe;
  zoneType: "supply" | "demand";
  strength: string;
  confidence: number;
  direction: "long" | "short";
  entry: number;
  target1: number;
  stopLoss: number;
  change24h: number;
  volume24h: number;
  zones: number;
  status?: string;
  setupScore: number;
}

export interface SdScanResult {
  demand: SdScanHit[];
  supply: SdScanHit[];
  demandTotal: number;
  supplyTotal: number;
  scannedAt: string;
  errors: string[];
}

export async function runSdScan(
  marketData: MarketDataPort,
  symbols: string[],
): Promise<SdScanResult> {
  const errors: string[] = [];
  const tickers = await marketData.fetchTickers24h(symbols).catch(() => []);
  const tickerMap = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
  const demand: SdScanHit[] = [];
  const supply: SdScanHit[] = [];

  await mapConcurrent(
    symbols,
    async (symbol) => {
      try {
        const candles = await marketData.fetchKlines(symbol, SD_SCAN_TIMEFRAME, 100);
        const sd: SdResult = detectSupplyDemand(candles, symbol, SD_SCAN_TIMEFRAME);
        if (!sd.setup) return;

        const setup = sd.setup;
        if (
          !ACTIVE_SETUP_STATUSES.includes(
            setup.status as (typeof ACTIVE_SETUP_STATUSES)[number],
          )
        ) {
          return;
        }

        const ticker = tickerMap.get(symbol);
        const hit: SdScanHit = {
          symbol,
          base: symbol.replace(/USDT$/, "") || symbol,
          timeframe: SD_SCAN_TIMEFRAME,
          zoneType: setup.zone.type,
          strength: setup.zone.strength,
          confidence: setup.confidence,
          direction: setup.direction,
          entry: setup.entry,
          target1: setup.target1,
          stopLoss: setup.stopLoss,
          change24h: ticker?.priceChangePercent ?? 0,
          volume24h: ticker?.quoteVolume ?? 0,
          zones: sd.zones.length,
          status: setup.status,
          setupScore: Math.round(setup.confidence * 0.82 + 8),
        };
        if (setup.zone.type === "demand") demand.push(hit);
        else supply.push(hit);
      } catch (error) {
        errors.push(`${symbol}: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    8,
  );

  const byVolume = (a: SdScanHit, b: SdScanHit) => b.volume24h - a.volume24h;
  demand.sort(byVolume);
  supply.sort(byVolume);

  return {
    demand,
    supply,
    demandTotal: demand.length,
    supplyTotal: supply.length,
    scannedAt: new Date().toISOString(),
    errors,
  };
}

export interface TopSetup {
  hit: SdScanHit;
  rank: number;
}

export function rankTopSetups(result: SdScanResult, limit = 5): TopSetup[] {
  const all = [...result.demand, ...result.supply];
  const live = (hit: SdScanHit) =>
    hit.status === "Limit Order" || hit.status === "Filled" || hit.status === "Running";
  const qualified = all.filter((hit) => live(hit) && hit.strength === "fresh");
  const livePool = qualified.length > 0 ? qualified : all.filter(live);
  const ranked = livePool.length > 0 ? livePool : all;

  ranked.sort((a, b) => {
    if (b.setupScore !== a.setupScore) return b.setupScore - a.setupScore;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.volume24h - a.volume24h;
  });

  return ranked.slice(0, limit).map((hit, index) => ({ hit, rank: index + 1 }));
}

const SD_CACHE_TTL_MS = 60_000;
let sdCache: { key: string; timestamp: number; result: SdScanResult } | null = null;
let sdInFlight: { key: string; promise: Promise<SdScanResult> } | null = null;

export function runSdScanCached(
  marketData: MarketDataPort,
  symbols: string[],
  force = false,
): Promise<SdScanResult> {
  const key = symbols.join(",");
  if (!force && sdCache?.key === key && Date.now() - sdCache.timestamp < SD_CACHE_TTL_MS) {
    return Promise.resolve(sdCache.result);
  }
  if (!force && sdInFlight?.key === key) return sdInFlight.promise;

  const promise = runSdScan(marketData, symbols)
    .then((result) => {
      sdCache = { key, timestamp: Date.now(), result };
      return result;
    })
    .finally(() => {
      if (sdInFlight?.promise === promise) sdInFlight = null;
    });
  sdInFlight = { key, promise };
  return promise;
}
