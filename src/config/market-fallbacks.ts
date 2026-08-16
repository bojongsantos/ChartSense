import type { MarketContext, SentimentData } from "@/core/domain/models";

export const marketFallback: MarketContext = {
  btc: { id: "btc", label: "BTC", value: "—", change: 0, direction: "flat" },
  eth: { id: "eth", label: "ETH", value: "—", change: 0, direction: "flat" },
  dominance: { id: "dom", label: "BTC Dominance", value: "—", change: 0, direction: "flat" },
  fundingRate: { id: "funding", label: "Funding Rate", value: "—", change: 0, direction: "flat", warning: true, hideDelta: true },
  openInterest: { id: "oi", label: "Open Interest", value: "—", change: 0, direction: "flat", warning: true, hideDelta: true },
  volume: { id: "fng", label: "Fear & Greed", value: "—", change: 0, direction: "flat", warning: true, hideDelta: true },
};

export const sentimentFallback: SentimentData = {
  score: 50,
  label: "Neutral",
  available: false,
  distribution: [
    { label: "Extreme Fear", value: 20 },
    { label: "Fear", value: 20 },
    { label: "Neutral", value: 20 },
    { label: "Greed", value: 20 },
    { label: "Extreme Greed", value: 20 },
  ],
};
