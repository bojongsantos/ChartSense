import type { Timeframe } from "./types";
import { fetchKlines, fetchTickers24h, mapConcurrent } from "./binance";
import { ACTIVE_SETUP_STATUSES, detectSupplyDemand, type SdResult } from "./supply-demand";
import { resolveWatchlist } from "./scanner-engine";

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
  /** Derived setup score (same formula as analysis engine). */
  setupScore: number;
}

export interface SdScanResult {
  demand: SdScanHit[];
  supply: SdScanHit[];
  scannedAt: string;
  errors: string[];
}

export async function runSdScan(symbols?: string[]): Promise<SdScanResult> {
  const targets = symbols ?? resolveWatchlist();
  const errors: string[] = [];
  let tickers: Awaited<ReturnType<typeof fetchTickers24h>> = [];
  try {
    tickers = await fetchTickers24h(targets);
  } catch {
    tickers = [];
  }
  const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

  const demand: SdScanHit[] = [];
  const supply: SdScanHit[] = [];

  await mapConcurrent(
    targets,
    async (symbol) => {
      try {
        const candles = await fetchKlines(symbol, SD_SCAN_TIMEFRAME, 100);
        const sd: SdResult = detectSupplyDemand(candles, symbol);
        if (!sd.setup) return;
        const s = sd.setup;
        // Only non-terminal setups belong in the table. Terminal ones
        // (Missed / Invalidated / Target 2 reached) are finished.
        if (!ACTIVE_SETUP_STATUSES.includes(s.status as (typeof ACTIVE_SETUP_STATUSES)[number])) return;
        const change24h = tickerMap.get(symbol)?.priceChangePercent ?? 0;
        const volume24h = tickerMap.get(symbol)?.quoteVolume ?? 0;
        const status = s.status;

        const hit: SdScanHit = {
          symbol,
          base: symbol.replace(/USDT$/, "") || symbol,
          timeframe: SD_SCAN_TIMEFRAME,
          zoneType: s.zone.type,
          strength: s.zone.strength,
          confidence: s.confidence,
          direction: s.direction,
          entry: s.entry,
          target1: s.target1,
          stopLoss: s.stopLoss,
          change24h,
          volume24h,
          zones: sd.zones.length,
          status,
          setupScore: Math.round(s.confidence * 0.82 + 8),
        };
        if (s.zone.type === "demand") demand.push(hit);
        else supply.push(hit);
      } catch (e) {
        errors.push(`${symbol}: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    20,
  );

  const sort = (a: SdScanHit, b: SdScanHit) => b.volume24h - a.volume24h;
  demand.sort(sort);
  supply.sort(sort);

  return { demand, supply, scannedAt: new Date().toISOString(), errors };
}

export interface TopSetup {
  hit: SdScanHit;
  rank: number;
}

/**
 * Scans the whole watchlist and returns setups ranked by Setup Score.
 * Only live (Limit Order / Filled / Running) + fresh zones qualify; ranking is
 * setupScore desc, tie-broken by confidence then 24h volume.
 */
export async function getTopSetups(limit = 5): Promise<TopSetup[]> {
  const res = await runSdScan();
  const all = [...res.demand, ...res.supply];

  const live = (h: SdScanHit) =>
    h.status === "Limit Order" || h.status === "Filled" || h.status === "Running";
  const qualified = all.filter((h) => live(h) && h.strength === "fresh");
  const pool = qualified.length > 0 ? qualified : all.filter(live);
  const ranked = pool.length > 0 ? pool : all;

  ranked.sort((a, b) => {
    if (b.setupScore !== a.setupScore) return b.setupScore - a.setupScore;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.volume24h - a.volume24h;
  });

  return ranked.slice(0, limit).map((hit, i) => ({ hit, rank: i + 1 }));
}
