import type {
  AnalysisResult,
  Candle,
  ChartData,
  DummyBundle,
  PatternSummary,
  PerformanceStats,
  ReasoningSection,
  RightRailData,
  ScannerOpportunity,
  SidebarData,
  SimilarPatternHit,
  Timeframe,
  TradeLevel,
} from "./types";

/**
 * Central dummy-data store.
 *
 * Shape mimics the API responses ChartSense will eventually return:
 *  - GET /api/analysis/:symbol -> AnalysisResult
 *  - GET /api/scanner          -> ScannerOpportunity[]
 *  - GET /api/context          -> RightRailData
 *
 * Swap these exports with real fetch results later — components never
 * hardcode data themselves.
 */

let seed = 1337;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function generateCandles(
  symbol: string,
  timeframe: Timeframe,
  count: number,
  basePrice: number,
): ChartData {
  const step = timeframe === "1D" ? 86_400 : timeframe === "4H" ? 14_400 : 3_600;
  const end = Math.floor(Date.now() / 1000);
  const candles: Candle[] = [];
  let price = basePrice;
  let drift = 0.0004;
  for (let i = count - 1; i >= 0; i--) {
    const time = end - i * step;
    const shock = (rand() - 0.5) * 0.012;
    if (i > count - 14 && timeframe === "1H") {
      drift = 0.0022;
    }
    const open = price;
    const close = Math.max(price * (1 + drift + shock), basePrice * 0.4);
    const high = Math.max(open, close) * (1 + rand() * 0.006);
    const low = Math.min(open, close) * (1 - rand() * 0.006);
    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.round(4_000_000 + rand() * 18_000_000),
    });
    price = close;
  }
  return { symbol, timeframe, candles };
}

export const chartDataByTimeframe: Record<Timeframe, ChartData> = {
  "15m": generateCandles("BTCUSDT", "15m", 240, 61_800),
  "1H": generateCandles("BTCUSDT", "1H", 420, 61_800),
  "4H": generateCandles("BTCUSDT", "4H", 360, 60_100),
  "1D": generateCandles("BTCUSDT", "1D", 240, 58_400),
};

export const analysis: AnalysisResult = {
  pair: {
    symbol: "BTCUSDT",
    base: "BTC",
    quote: "USDT",
    name: "Bitcoin",
    price: 62_540,
    change24h: 3.42,
  },
  timeframe: "1D",
  exchange: "Binance",
  analyzedAt: "2026-08-03T18:45:00Z",
  chartData: chartDataByTimeframe["1D"],
  pattern: {
    id: "pat-ascending-triangle-btcusdt",
    name: "Ascending Triangle",
    symbol: "BTCUSDT",
    confidence: 87,
    trend: "bullish",
    status: "Active",
    setupScore: 82,
    probability: 78,
    riskLevel: "low",
    timeframe: "1D",
    exchange: "Binance",
    detectedAt: "2026-08-03T18:45:00Z",
  },
  levels: [
    {
      id: "entry",
      label: "Entry",
      shortLabel: "Entry",
      price: 62_540,
      changeFromPrice: 0,
      filled: true,
    },
    {
      id: "target-1",
      label: "Target 1",
      shortLabel: "T1",
      price: 66_800,
      changeFromPrice: 6.81,
      filled: false,
    },
    {
      id: "target-2",
      label: "Target 2",
      shortLabel: "T2",
      price: 72_400,
      changeFromPrice: 15.77,
      filled: false,
    },
    {
      id: "sl",
      label: "Invalidation (SL)",
      shortLabel: "SL",
      price: 58_900,
      changeFromPrice: -5.82,
      filled: false,
    },
  ],
  riskReward: 2.64,
  reasoning: [
    {
      id: "trend",
      title: "Tren dan Struktur",
      points: [
        "Higher lows terus terbentuk sejak 14 Juni pada grafik harian, yang menandakan pergeseran struktur pasar menjadi bullish.",
        "Harga bertahan di atas EMA 50 (58.900) sementara EMA 200 bergerak naik.",
        "Volume breakout mencapai 1,8x rata-rata 20 hari, yang mengonfirmasi adanya permintaan nyata.",
      ],
    },
    {
      id: "levels",
      title: "Level Kunci",
      points: [
        "Resistance di 62.800 telah diuji sebanyak 3 kali dan rentangnya semakin menyempit setiap kali.",
        "Cluster support berada di rentang 60.100 hingga 60.400, yang sejajar dengan retracement Fibonacci 0.618.",
        "Pivot mingguan di 60.350 menambah konfluensi pada zona demand.",
      ],
    },
    {
      id: "liquidity",
      title: "Likuiditas dan Aliran",
      points: [
        "Funding rate berada di +0,008%, yang menunjukkan posisi bullish ringan dengan ruang untuk kenaikan berbasis spot.",
        "Order book agregat menunjukkan 62% kedalaman sisi bid berada di atas harga saat ini.",
        "Open interest naik 4,1% dalam 24 jam, yang berarti ada uang baru masuk dan bukan sekadar menutup posisi short.",
      ],
    },
    {
      id: "risk",
      title: "Faktor Risiko",
      points: [
        "Ada agenda makro (rilis CPI) dalam jendela target, jadi kurangi ukuran posisi jika volatilitas melonjak.",
        "Penutupan harian di bawah 58.900 akan membatalkan setup, sehingga hindari menambah posisi saat turun.",
      ],
    },
  ],
  performance: {
    successRate: 76,
    totalTrades: 148,
    avgGain: 11.4,
    avgLoss: 4.2,
    profitFactor: 2.9,
    breakdown: [
      { label: "Breakout confirmed", value: 76, color: "positive" },
      { label: "Breakout failed", value: 24, color: "negative" },
    ],
  },
  similarPatterns: [
    {
      id: "sim-1",
      pair: "ETHUSDT",
      pattern: "Ascending Triangle",
      timeframe: "1D",
      confidence: 91,
      outcome: "win",
      outcomePct: 18.6,
    },
    {
      id: "sim-2",
      pair: "SOLUSDT",
      pattern: "Bullish Flag",
      timeframe: "4H",
      confidence: 84,
      outcome: "win",
      outcomePct: 9.8,
    },
    {
      id: "sim-3",
      pair: "AVAXUSDT",
      pattern: "Ascending Triangle",
      timeframe: "1D",
      confidence: 79,
      outcome: "loss",
      outcomePct: -4.1,
    },
    {
      id: "sim-4",
      pair: "LINKUSDT",
      pattern: "Symmetrical Triangle",
      timeframe: "1D",
      confidence: 88,
      outcome: "pending",
      outcomePct: 0,
    },
    {
      id: "sim-5",
      pair: "XRPUSDT",
      pattern: "Bullish Flag",
      timeframe: "4H",
      confidence: 72,
      outcome: "win",
      outcomePct: 6.2,
    },
  ],
};

export const scannerOpportunities: ScannerOpportunity[] = [
  {
    rank: 1,
    pair: { symbol: "BTCUSDT", base: "BTC", quote: "USDT", name: "Bitcoin", price: 62_540, change24h: 3.42 },
    confidence: 93,
    pattern: "Ascending Triangle",
    timeframe: "1D",
    setup: "long",
    sparkline: [58.1, 58.4, 58.2, 58.9, 59.3, 59.1, 59.8, 60.4, 60.1, 60.9, 61.5, 61.2, 61.9, 62.5],
  },
  {
    rank: 2,
    pair: { symbol: "ETHUSDT", base: "ETH", quote: "USDT", name: "Ethereum", price: 3_486, change24h: 2.18 },
    confidence: 89,
    pattern: "Cup & Handle",
    timeframe: "4H",
    setup: "long",
    sparkline: [3260, 3290, 3275, 3310, 3345, 3330, 3360, 3390, 3375, 3400, 3420, 3410, 3450, 3486],
  },
  {
    rank: 3,
    pair: { symbol: "SOLUSDT", base: "SOL", quote: "USDT", name: "Solana", price: 168.4, change24h: 5.11 },
    confidence: 86,
    pattern: "Bullish Flag",
    timeframe: "1H",
    setup: "long",
    sparkline: [151, 153, 152, 155, 157, 156, 158, 161, 160, 162, 164, 163, 166, 168.4],
  },
  {
    rank: 4,
    pair: { symbol: "LINKUSDT", base: "LINK", quote: "USDT", name: "Chainlink", price: 24.9, change24h: -1.24 },
    confidence: 81,
    pattern: "Descending Wedge",
    timeframe: "1D",
    setup: "long",
    sparkline: [25.8, 25.6, 25.7, 25.4, 25.5, 25.2, 25.3, 25.0, 25.1, 24.9, 25.0, 24.8, 24.9, 24.9],
  },
  {
    rank: 5,
    pair: { symbol: "AVAXUSDT", base: "AVAX", quote: "USDT", name: "Avalanche", price: 31.2, change24h: 1.87 },
    confidence: 77,
    pattern: "Rising Wedge",
    timeframe: "4H",
    setup: "short",
    sparkline: [33.1, 32.8, 33.0, 32.6, 32.4, 32.5, 32.2, 31.9, 32.0, 31.7, 31.5, 31.4, 31.3, 31.2],
  },
  {
    rank: 6,
    pair: { symbol: "XRPUSDT", base: "XRP", quote: "USDT", name: "XRP", price: 0.612, change24h: 0.94 },
    confidence: 74,
    pattern: "Double Bottom",
    timeframe: "1D",
    setup: "long",
    sparkline: [0.584, 0.586, 0.583, 0.588, 0.59, 0.589, 0.593, 0.597, 0.595, 0.6, 0.603, 0.601, 0.607, 0.612],
  },
  {
    rank: 7,
    pair: { symbol: "DOTUSDT", base: "DOT", quote: "USDT", name: "Polkadot", price: 6.84, change24h: -2.31 },
    confidence: 69,
    pattern: "Head & Shoulders",
    timeframe: "1D",
    setup: "short",
    sparkline: [7.12, 7.08, 7.1, 7.02, 7.0, 6.98, 7.01, 6.95, 6.93, 6.9, 6.88, 6.89, 6.86, 6.84],
  },
  {
    rank: 8,
    pair: { symbol: "ADAUSDT", base: "ADA", quote: "USDT", name: "Cardano", price: 0.448, change24h: 1.12 },
    confidence: 66,
    pattern: "Cup & Handle",
    timeframe: "1D",
    setup: "long",
    sparkline: [0.428, 0.431, 0.43, 0.434, 0.437, 0.435, 0.439, 0.442, 0.441, 0.444, 0.445, 0.443, 0.446, 0.448],
  },
];

export const sidebarData: SidebarData = {
  navCounts: {
    alerts: 4,
  },
  usage: {
    used: 14,
    limit: 20,
    resetsIn: "2d 04h",
  },
};

export const rightRail: RightRailData = {
  market: {
    btc: { id: "btc", label: "BTC", value: "62,540", change: 3.42, direction: "up" },
    eth: { id: "eth", label: "ETH", value: "3,486", change: 2.18, direction: "up" },
    dominance: { id: "dom", label: "BTC Dominance", value: "55.2%", change: -0.4, direction: "down", hint: "24h change" },
    fundingRate: { id: "funding", label: "Funding Rate", value: "+0.0125%", change: 0.0125, direction: "up", hint: "BTC perp · 8h", tone: "positive", hideDelta: true },
    openInterest: { id: "oi", label: "Open Interest", value: "$13.4B", change: 0, direction: "flat", hint: "BTC futures", hideDelta: true },
    volume: { id: "vol", label: "24h Volume", value: "$92.6B", change: 12.8, direction: "up" },
  },
  sentiment: {
    score: 68,
    label: "Greed",
    distribution: [
      { label: "Extreme Fear", value: 5 },
      { label: "Fear", value: 15 },
      { label: "Neutral", value: 25 },
      { label: "Greed", value: 40 },
      { label: "Extreme Greed", value: 15 },
    ],
  },
  chat: {
    messages: [
      {
        id: "m1",
        role: "assistant",
        content: "BTC is in an ascending triangle on the daily. 78% probability of a bullish breakout toward 66,800.",
        time: "18:41",
      },
      {
        id: "m2",
        role: "user",
        content: "What's the invalidation level for this setup?",
        time: "18:43",
      },
      {
        id: "m3",
        role: "assistant",
        content: "A daily close below 58,900 invalidates the setup. Risk-to-reward sits at 2.64.",
        time: "18:43",
      },
    ],
    suggestions: ["Explain the setup score", "Compare with ETH", "Show similar past patterns"],
  },
};

export const dummyBundle: DummyBundle = {
  analysis,
  scanner: scannerOpportunities,
  sidebar: sidebarData,
  rightRail,
};

export const patternById = (id: string): PatternSummary | undefined =>
  analysis.pattern.id === id ? analysis.pattern : undefined;

export const performanceById = (): PerformanceStats => analysis.performance;

export const reasoningById = (): ReasoningSection[] => analysis.reasoning;

export const similarPatternsById = (): SimilarPatternHit[] => analysis.similarPatterns;

export const levelsById = (): TradeLevel[] => analysis.levels;

export function getChartData(symbol: string, timeframe: Timeframe): ChartData {
  void symbol;
  return chartDataByTimeframe[timeframe];
}

export const chartPrecision = (symbol: string): number => (symbol.includes("USDT") ? 1 : 4);
