import "server-only";

import type { MarketContextPayload } from "@/core/domain/models";
import { formatCompact } from "@/shared/lib/format";
import { marketData } from "@/infrastructure/market-data/market-data-provider";

const MARKET_TTL_MS = 30_000;
const EXTERNAL_TIMEOUT_MS = 8_000;

let cached: { timestamp: number; payload: MarketContextPayload } | null = null;
let inFlight: Promise<MarketContextPayload> | null = null;

async function externalJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} HTTP ${res.status}`);
  return (await res.json()) as T;
}

function optionalFinite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function fearGreedLabel(value: number): string {
  if (value <= 20) return "Extreme Fear";
  if (value <= 40) return "Fear";
  if (value < 60) return "Neutral";
  if (value < 80) return "Greed";
  return "Extreme Greed";
}

async function buildPayload(): Promise<MarketContextPayload> {
  const [btcResult, ethResult, fundingResult, oiResult, dominanceResult, fearGreedResult] =
    await Promise.allSettled([
      marketData.fetchTicker24h("BTCUSDT"),
      marketData.fetchTicker24h("ETHUSDT"),
      externalJson<{ lastFundingRate?: string }>(
        "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
      ),
      externalJson<{ openInterest?: string }>(
        "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT",
      ),
      externalJson<{
        data?: {
          market_cap_percentage?: { btc?: number };
          market_cap_change_percentage_24h_usd?: number;
        };
      }>("https://api.coingecko.com/api/v3/global"),
      externalJson<{ data?: Array<{ value?: string }> }>("https://api.alternative.me/fng/"),
    ]);

  if (btcResult.status !== "fulfilled" || ethResult.status !== "fulfilled") {
    throw new Error("Core exchange ticker data is unavailable");
  }

  const btc = btcResult.value;
  const eth = ethResult.value;
  const fundingRate =
    fundingResult.status === "fulfilled"
      ? optionalFinite(fundingResult.value.lastFundingRate)
      : null;
  const openInterestBtc =
    oiResult.status === "fulfilled"
      ? optionalFinite(oiResult.value.openInterest)
      : null;
  const dominance =
    dominanceResult.status === "fulfilled"
      ? dominanceResult.value.data?.market_cap_percentage?.btc
      : undefined;
  const dominanceChange =
    dominanceResult.status === "fulfilled"
      ? dominanceResult.value.data?.market_cap_change_percentage_24h_usd
      : undefined;
  const fearGreedValue =
    fearGreedResult.status === "fulfilled"
      ? optionalFinite(fearGreedResult.value.data?.[0]?.value)
      : null;
  const fearGreed = fearGreedValue ?? 50;
  const fearGreedAvailable = fearGreedValue !== null;
  const sentimentLabel = fearGreedLabel(fearGreed);

  return {
    fetchedAt: new Date().toISOString(),
    context: {
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
        value: typeof dominance === "number" ? `${dominance.toFixed(2)}%` : "—",
        change: dominanceChange ?? 0,
        direction: !dominanceChange ? "flat" : dominanceChange > 0 ? "up" : "down",
        hint: "24h change",
        warning: typeof dominance !== "number",
      },
      fundingRate: {
        id: "funding",
        label: "Funding Rate",
        value: fundingRate === null ? "—" : `${(fundingRate * 100).toFixed(4)}%`,
        change: fundingRate === null ? 0 : fundingRate * 100,
        direction: fundingRate === null || fundingRate === 0 ? "flat" : fundingRate > 0 ? "up" : "down",
        hint: "BTC perp · 8h",
        tone: fundingRate === null ? undefined : fundingRate >= 0 ? "positive" : "negative",
        warning: fundingRate === null,
        hideDelta: true,
      },
      openInterest: {
        id: "oi",
        label: "Open Interest",
        value:
          openInterestBtc === null
            ? "—"
            : `$${(openInterestBtc * btc.lastPrice / 1e9).toFixed(1)}B`,
        change: 0,
        direction: "flat",
        hint: "BTC futures",
        warning: openInterestBtc === null,
        hideDelta: true,
      },
      volume: {
        id: "fng",
        label: "Fear & Greed",
        value: fearGreedAvailable ? `${sentimentLabel} · ${fearGreed}/100` : "—",
        change: 0,
        direction: "flat",
        tone:
          sentimentLabel.includes("Fear")
            ? "negative"
            : sentimentLabel.includes("Greed")
              ? "positive"
              : undefined,
        warning: !fearGreedAvailable,
        hideDelta: true,
      },
    },
    sentiment: {
      score: fearGreed,
      label: sentimentLabel,
      available: fearGreedAvailable,
      // This is an index scale, not an invented market distribution.
      distribution: [
        { label: "Extreme Fear", value: 20 },
        { label: "Fear", value: 20 },
        { label: "Neutral", value: 20 },
        { label: "Greed", value: 20 },
        { label: "Extreme Greed", value: 20 },
      ],
    },
  };
}

export function getMarketContextPayload(force = false): Promise<MarketContextPayload> {
  if (!force && cached && Date.now() - cached.timestamp < MARKET_TTL_MS) {
    return Promise.resolve(cached.payload);
  }
  if (!force && inFlight) return inFlight;
  inFlight = buildPayload()
    .then((payload) => {
      cached = { timestamp: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
