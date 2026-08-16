export type Plan = "free" | "premium";

export type Trend = "bullish" | "bearish" | "neutral";

export type RiskLevel = "low" | "medium" | "high";

export type Timeframe = "15m" | "1H" | "4H" | "1D";

export type SetupDirection = "long" | "short";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
}

export interface PairSummary {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  price: number;
  change24h: number;
}

export interface SdZoneShape {
  id: string;
  type: "supply" | "demand";
  top: number;
  bottom: number;
  baseTime: number;
  strength: "fresh" | "tested" | "broken";
  active: boolean;
  confidence: number;
  narrowness: number;
  touches: number;
}

export interface PatternLineShape {
  zones?: SdZoneShape[];
  setup?: {
    direction: "long" | "short";
    entry: number;
    target1: number;
    target2: number;
    stopLoss: number;
    riskReward: number;
    confidence: number;
    zoneId?: string;
  };
  bias?: "bullish" | "bearish" | "neutral";
  support?: number;
  resistance?: number;
}

export interface PatternSummary {
  id: string;
  name: string;
  symbol: string;
  confidence: number;
  trend: Trend;
  status: string;
  setupScore: number;
  probability: number;
  riskLevel: RiskLevel;
  timeframe: Timeframe;
  exchange: string;
  detectedAt: string;
  shape?: PatternLineShape;
}

export interface TradeLevel {
  id: "entry" | "target-1" | "target-2" | "sl";
  label: string;
  shortLabel: string;
  price: number;
  changeFromPrice: number;
  filled: boolean;
}

export interface ReasoningSection {
  id: string;
  title: string;
  points: string[];
}

export interface PerformanceStats {
  successRate: number;
  totalTrades: number;
  avgGain: number;
  avgLoss: number;
  profitFactor: number;
  breakdown: {
    label: string;
    value: number;
    color: "positive" | "negative" | "neutral";
  }[];
}

export interface SimilarPatternHit {
  id: string;
  pair: string;
  pattern: string;
  timeframe: Timeframe;
  confidence: number;
  outcome: "win" | "loss" | "pending";
  outcomePct: number;
}

export interface AnalysisResult {
  pair: PairSummary;
  timeframe: Timeframe;
  exchange: string;
  analyzedAt: string;
  chartData: ChartData;
  pattern: PatternSummary;
  levels: TradeLevel[];
  riskReward: number;
  reasoning: ReasoningSection[];
  performance: PerformanceStats;
  similarPatterns: SimilarPatternHit[];
}

export interface ScannerOpportunity {
  rank: number;
  pair: PairSummary;
  confidence: number;
  pattern: string;
  timeframe: Timeframe;
  setup: SetupDirection;
  sparkline: number[];
  status?: string;
  /** Technical signals captured during the scan, used to derive Trade Readiness. */
  rsi?: number;
  ema20?: number;
  ema50?: number;
  volumeRatio?: number;
  entry?: number;
  support?: number;
  resistance?: number;
  zoneTop?: number;
  zoneBottom?: number;
  narrowness?: number;
  strength?: "fresh" | "tested" | "broken";
  touches?: number;
}

export interface MarketMetric {
  id: string;
  label: string;
  value: string;
  change: number;
  direction: "up" | "down" | "flat";
  hint?: string;
  /** Optional tone for the value text (e.g. funding rate sign). */
  tone?: "positive" | "negative";
  /** Show a warning icon instead of a Delta (fetch failed / CORS). */
  warning?: boolean;
  /** Hide the Delta cell entirely (no change data available). */
  hideDelta?: boolean;
}

export interface MarketContext {
  btc: MarketMetric;
  eth: MarketMetric;
  dominance: MarketMetric;
  fundingRate: MarketMetric;
  openInterest: MarketMetric;
  volume: MarketMetric;
}

export interface SentimentData {
  score: number;
  label: string;
  distribution: { label: string; value: number }[];
  available?: boolean;
}

export interface MarketTicker {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  volume: number;
}

export interface MarketContextPayload {
  context: MarketContext;
  sentiment: SentimentData;
  fetchedAt: string;
}
