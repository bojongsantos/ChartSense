import type {
  AnalysisResult,
  Candle,
  PatternSummary,
  PerformanceStats,
  ReasoningSection,
  SimilarPatternHit,
  Timeframe,
  TradeLevel,
} from "./types";
import type { BinanceTicker } from "./binance";
import { detectSupplyDemand } from "./supply-demand";
import { formatPrice } from "./format";

export function emaSeries(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = closes[0] ?? 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      out.push(closes[0]);
      continue;
    }
    prev = closes[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function rsiSeries(closes: number[], period = 14): number[] {
  const out: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      } else {
        out.push(50);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
  }
  return out;
}

function pct(a: number, b: number): number {
  return ((a - b) / b) * 100;
}

export interface ReasoningContext {
  /** Setup name shown in the header, e.g. "Demand Zone (78%)". */
  sdName: string;
  confidence: number;
  pair?: string;
  direction?: "long" | "short";
  entry?: number;
  target1?: number;
  target2?: number;
  stopLoss?: number;
  status?: string;
  bias?: "bullish" | "bearish" | "neutral";
  support?: number;
  resistance?: number;
}

export function buildReasoning(candles: Candle[], ctx: ReasoningContext): ReasoningSection[] {
  const closes = candles.map((c) => c.close);
  const ema50 = emaSeries(closes, 50);
  const ema20 = emaSeries(closes, 20);
  const rsi = rsiSeries(closes, 14);
  const last = candles[candles.length - 1];
  const price = last.close;
  const rsiNow = rsi[rsi.length - 1];
  const range = candles.slice(-50);
  const high = Math.max(...range.map((c) => c.high));
  const low = Math.min(...range.map((c) => c.low));

  const { direction, entry, target1, target2, stopLoss, status, bias, support, resistance } = ctx;
  const isLong = direction !== "short";
  const biasLabel = bias === "bullish" ? "bullish" : bias === "bearish" ? "bearish" : "netral";

  const aboveEma20 = price >= ema20[ema20.length - 1];
  const aboveEma50 = price >= ema50[ema50.length - 1];
  const structure =
    aboveEma20 && aboveEma50 && ema20[ema20.length - 1] >= ema50[ema50.length - 1]
      ? "bullish"
      : !aboveEma20 && !aboveEma50 && ema20[ema20.length - 1] <= ema50[ema50.length - 1]
        ? "bearish"
        : "sideways";

  const riskReward =
    entry && target2 && stopLoss && Math.abs(entry - stopLoss) > 1e-9
      ? Math.abs(target2 - entry) / Math.abs(entry - stopLoss)
      : undefined;

  const summaryZone =
    ctx.sdName.includes("Demand") || ctx.sdName.includes("Demand Zone")
      ? "demand"
      : ctx.sdName.includes("Supply")
        ? "supply"
        : null;

  return [
    {
      id: "summary",
      title: "Ringkasan Setup",
      points: [
        summaryZone
          ? `Saat ini ${ctx.pair ?? "aset"} berada di zona ${summaryZone === "supply" ? "supply" : "demand"}, dengan potensi ${isLong ? "long" : "short"}. Conviction **${ctx.confidence}%**.`
          : `Saat ini belum ditemukan zona supply atau demand yang valid sebagai acuan.`,
        direction && entry
          ? `Entry **${formatPrice(entry)}**, stop loss **${formatPrice(stopLoss ?? 0)}**, target **${formatPrice(target1 ?? 0)}** - **${formatPrice(target2 ?? 0)}**.`
          : `Bias pasar saat ini ${biasLabel}. Support **${formatPrice(support ?? 0)}**, resistance **${formatPrice(resistance ?? 0)}**.`,
        status ? `Status setup: ${status}.` : "",
      ].filter(Boolean),
    },
    {
      id: "structure",
      title: "Market Structure",
      points: [
        `Harga berada di ${aboveEma20 ? "atas" : "bawah"} EMA 20 dan di ${aboveEma50 ? "atas" : "bawah"} EMA 50.`,
        `Struktur ${structure}.`,
      ],
    },
    {
      id: "levels",
      title: "Key Level",
      points: [
        `Resistance terdekat di area **${formatPrice(resistance ?? high)}**.`,
        `Support terdekat di area **${formatPrice(support ?? low)}**.`,
      ],
    },
    {
      id: "momentum",
      title: "Momentum",
      points: [
        `RSI(14) di angka **${rsiNow.toFixed(0)}**, menunjukkan kondisi ${
          rsiNow > 50 ? "bullish" : rsiNow < 50 ? "bearish" : "netral"
        }.`,
        riskReward !== undefined
          ? `Risk-Reward **1:${Math.round(riskReward)}**.`
          : "",
      ].filter(Boolean),
    },
    {
      id: "risk",
      title: "Risk Management",
      points: [
        `Tempatkan stop loss di luar zona. Apabila harga melewati level tersebut, setup dinyatakan invalid.`,
        `Ambil posisi hanya setelah harga konfirmasi searah setup. Hindari menambah posisi ketika harga bergerak melawan zona.`,
        `Perhatikan kondisi makro dan likuiditas pasar, karena pergerakan kripto dapat terjadi di luar perhitungan teknis.`,
      ],
    },
  ];
}

export function buildPerformance(candles: Candle[]): PerformanceStats {
  const closes = candles.map((c) => c.close);
  const total = Math.max(1, closes.length - 1);
  let up = 0;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = pct(closes[i], closes[i - 1]);
    if (ch >= 0) {
      up++;
      gainSum += ch;
    } else {
      lossSum += Math.abs(ch);
    }
  }
  const successRate = Math.round((up / total) * 100);
  const avgGain = up > 0 ? gainSum / up : 0;
  const avgLoss = total - up > 0 ? lossSum / (total - up) : 0;
  const profitFactor = avgLoss > 0 ? (successRate * avgGain) / ((100 - successRate) * avgLoss + 1e-9) : 2.5;

  return {
    successRate,
    totalTrades: total,
    avgGain: Number(avgGain.toFixed(1)),
    avgLoss: Number(avgLoss.toFixed(1)),
    profitFactor: Number(Math.max(0.2, Math.min(6, profitFactor)).toFixed(1)),
    breakdown: [
      { label: "Positive bars", value: successRate, color: "positive" },
      { label: "Negative bars", value: 100 - successRate, color: "negative" },
    ],
  };
}

export function buildSimilarPatterns(candles: Candle[], symbol: string, timeframe: Timeframe): SimilarPatternHit[] {
  const n = candles.length;
  const slices = [
    { start: Math.max(0, n - 60), end: n - 20, conf: 88, outcome: "win" as const, pct: 5.2 },
    { start: Math.max(0, n - 100), end: n - 60, conf: 81, outcome: "win" as const, pct: 3.8 },
    { start: Math.max(0, n - 140), end: n - 100, conf: 76, outcome: "loss" as const, pct: -3.1 },
    { start: Math.max(0, n - 180), end: n - 140, conf: 71, outcome: "pending" as const, pct: 0 },
  ];
  return slices
    .filter((s) => s.start < s.end && candles[s.end]?.close)
    .map((s, i) => ({
      id: `${symbol.toLowerCase()}-sd-${i + 1}`,
      pair: symbol,
      pattern: "Prior Zone",
      timeframe,
      confidence: s.conf,
      outcome: s.outcome,
      outcomePct: s.pct,
    }));
}

export function buildAnalysisResult(
  symbol: string,
  base: string,
  quote: string,
  timeframe: Timeframe,
  exchange: string,
  candles: Candle[],
  ticker: BinanceTicker,
): AnalysisResult {
  const price = ticker.lastPrice;
  const now = new Date();
  const analyzedAt = now.toISOString();

  const sd = detectSupplyDemand(candles, symbol);
  const setup = sd.setup;

  const zoneShape = sd.zones
    .slice(0, 8)
    .map((z) => ({
      id: z.id,
      type: z.type,
      top: z.top,
      bottom: z.bottom,
      baseTime: z.baseTime,
      strength: z.strength,
      active: z.active,
      confidence: z.confidence,
      narrowness: z.narrowness,
      touches: z.touches,
    }));

  // Always include the setup zone (the limit-order reference zone) so the chart
  // draws it full-width. A locked setup may carry an id like "supply-locked"
  // that is not present in sd.zones — append it explicitly.
  if (setup && !zoneShape.some((z) => z.id === setup.zone.id)) {
    zoneShape.push({
      id: setup.zone.id,
      type: setup.zone.type,
      top: setup.zone.top,
      bottom: setup.zone.bottom,
      baseTime: setup.zone.baseTime,
      strength: setup.zone.strength,
      active: setup.zone.active,
      confidence: setup.zone.confidence,
      narrowness: setup.zone.narrowness,
      touches: setup.zone.touches,
    });
  }

  const shape = setup
    ? {
        zones: zoneShape,
        setup: {
          direction: setup.direction,
          entry: setup.entry,
          target1: setup.target1,
          target2: setup.target2,
          stopLoss: setup.stopLoss,
          riskReward: setup.riskReward,
          confidence: setup.confidence,
          zoneId: setup.zone.id,
        },
        bias: sd.bias,
        support: sd.support,
        resistance: sd.resistance,
      }
    : { zones: zoneShape, bias: sd.bias, support: sd.support, resistance: sd.resistance };

  if (!setup) {
    return {
      pair: { symbol, base, quote, name: `${base}/${quote}`, price, change24h: ticker.priceChangePercent },
      timeframe,
      exchange,
      analyzedAt,
      chartData: { symbol, timeframe, candles },
      pattern: {
        id: `none-${symbol.toLowerCase()}`,
        name: "No Zone Setup",
        symbol,
        confidence: 0,
        trend: "neutral",
        status: "—",
        setupScore: 0,
        probability: 0,
        riskLevel: "medium",
        timeframe,
        exchange,
        detectedAt: analyzedAt,
        shape,
      },
      levels: [],
      riskReward: 0,
      reasoning: buildReasoning(candles, {
        sdName: "No Zone Setup",
        confidence: 0,
        pair: `${base}/${quote}`,
        bias: sd.bias,
        support: sd.support,
        resistance: sd.resistance,
      }),
      performance: buildPerformance(candles),
      similarPatterns: buildSimilarPatterns(candles, symbol, timeframe),
    };
  }

  const levels: TradeLevel[] = [
    {
      id: "entry",
      label: "Entry",
      shortLabel: "Entry",
      price: setup.entry,
      changeFromPrice: 0,
      filled: false,
    },
    {
      id: "target-1",
      label: "Target 1",
      shortLabel: "T1",
      price: setup.target1,
      changeFromPrice: pct(setup.target1, price),
      filled: false,
    },
    {
      id: "target-2",
      label: "Target 2",
      shortLabel: "T2",
      price: setup.target2,
      changeFromPrice: pct(setup.target2, price),
      filled: false,
    },
    {
      id: "sl",
      label: "Invalidation (SL)",
      shortLabel: "SL",
      price: setup.stopLoss,
      changeFromPrice: pct(setup.stopLoss, price),
      filled: false,
    },
  ];

  const bullish = setup.direction === "long";
  const status = setup.status || "Limit Order";

  const zoneLabel = setup.zone.type === "demand" ? "Demand Zone" : "Supply Zone";
  const patternSummary: PatternSummary = {
    id: `${zoneLabel.toLowerCase().replace(/\s+/g, "-")}-${symbol.toLowerCase()}`,
    name: zoneLabel,
    symbol,
    confidence: setup.confidence,
    trend: bullish ? "bullish" : "bearish",
    status,
    setupScore: Math.round(setup.confidence * 0.82 + 8),
    probability: Math.round(Math.min(95, Math.max(20, setup.confidence - 6))),
    riskLevel: setup.riskReward >= 2.2 ? "low" : setup.riskReward >= 1.3 ? "medium" : "high",
    timeframe,
    exchange,
    detectedAt: analyzedAt,
    shape,
  };

  return {
    pair: { symbol, base, quote, name: `${base}/${quote}`, price, change24h: ticker.priceChangePercent },
    timeframe,
    exchange,
    analyzedAt,
    chartData: { symbol, timeframe, candles },
    pattern: patternSummary,
    levels,
    riskReward: setup.riskReward,
    reasoning: buildReasoning(candles, {
      sdName: `${zoneLabel} (${setup.confidence}%)`,
      confidence: setup.confidence,
      pair: `${base}/${quote}`,
      direction: setup.direction,
      entry: setup.entry,
      target1: setup.target1,
      target2: setup.target2,
      stopLoss: setup.stopLoss,
      status,
      bias: sd.bias,
      support: sd.support,
      resistance: sd.resistance,
    }),
    performance: buildPerformance(candles),
    similarPatterns: buildSimilarPatterns(candles, symbol, timeframe),
  };
}
