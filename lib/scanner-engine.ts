import type { ScannerOpportunity, Timeframe } from "./types";
import { fetchKlines, fetchTickers24h, mapConcurrent } from "./binance";
import { detectSupplyDemand } from "./supply-demand";
import { getEnabledWatchlist, isBrowser } from "./admin";
import { DEFAULT_WATCHLIST } from "./default-watchlist";
import { emaSeries, rsiSeries } from "./analysis-engine";

export const WATCHLIST = DEFAULT_WATCHLIST;

export function resolveWatchlist(): string[] {
  if (isBrowser()) {
    const enabled = getEnabledWatchlist();
    if (enabled.length > 0) return enabled;
  }
  return WATCHLIST;
}

const SCAN_TIMEFRAME: Timeframe = "15m";

export interface ScanResult {
  opportunities: ScannerOpportunity[];
  scannedAt: string;
  errors: string[];
}

function sparkline(candles: { close: number }[], points = 14): number[] {
  const n = candles.length;
  const step = Math.max(1, Math.floor(n / points));
  const out: number[] = [];
  for (let i = n - points * step; i < n; i += step) {
    if (i >= 0) out.push(candles[i].close);
  }
  while (out.length < points) out.push(candles[candles.length - 1]?.close ?? 0);
  return out;
}

export async function runScanner(symbols?: string[]): Promise<ScanResult> {
  const targets = symbols ?? resolveWatchlist();
  const errors: string[] = [];
  let tickers;
  try {
    tickers = await fetchTickers24h(targets);
  } catch {
    const individual = await Promise.allSettled(
      targets.map(async (s) => (await import("./binance")).fetchTicker24h(s)),
    );
    tickers = individual
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchTickers24h>>[number]> => r.status === "fulfilled")
      .map((r) => r.value);
  }

  const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

  const results = await Promise.allSettled(
    await mapConcurrent(
      targets,
      async (symbol, idx) => {
        const ticker = tickerMap.get(symbol);
        if (!ticker) throw new Error(`No ticker for ${symbol}`);
        const candles = await fetchKlines(symbol, SCAN_TIMEFRAME, 100);
        const sd = detectSupplyDemand(candles, symbol);
        if (!sd.setup) return null;
        const s = sd.setup;
        const price = ticker.lastPrice;
        const base = symbol.replace(/USDT$/, "");
        const status = s.status || "Limit Order";

        const closes = candles.map((c) => c.close);
        const last = candles[candles.length - 1];
        const ema20 = emaSeries(closes, 20).at(-1) ?? price;
        const ema50 = emaSeries(closes, 50).at(-1) ?? price;
        const rsiNow = rsiSeries(closes, 14).at(-1) ?? 50;
        const avgVol = candles.slice(-20).reduce((a, c) => a + c.volume, 0) / Math.max(1, candles.length);
        const volumeRatio = last ? last.volume / Math.max(1, avgVol) : 0;

        return {
          rank: idx + 1,
          pair: {
            symbol,
            base,
            quote: "USDT",
            name: base,
            price,
            change24h: ticker.priceChangePercent,
          },
          confidence: s.confidence,
          pattern: s.zone.type === "demand" ? "Demand Zone" : "Supply Zone",
          timeframe: SCAN_TIMEFRAME,
          setup: s.direction,
          sparkline: sparkline(candles),
          status,
          rsi: rsiNow,
          ema20,
          ema50,
          volumeRatio,
          entry: s.entry,
          support: sd.support,
          resistance: sd.resistance,
          zoneTop: s.zone.top,
          zoneBottom: s.zone.bottom,
          narrowness: s.zone.narrowness,
          strength: s.zone.strength,
          touches: s.zone.touches,
        };
      },
      20,
    ),
  );

  const opportunities: ScannerOpportunity[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      opportunities.push(r.value);
    } else if (r.status === "rejected") {
      errors.push(`${targets[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  });

  opportunities.sort((a, b) => b.confidence - a.confidence);
  opportunities.forEach((o, i) => {
    o.rank = i + 1;
  });

  return { opportunities, scannedAt: new Date().toISOString(), errors };
}
