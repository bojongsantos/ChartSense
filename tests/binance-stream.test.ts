import assert from "node:assert/strict";
import test from "node:test";
import { parseBinanceStreamMessage } from "@/infrastructure/market-data/binance-stream-client";
import { prependCandleHistory } from "@/presentation/hooks/use-live-analysis";

test("Binance stream messages map to live candles and tickers", () => {
  const candle = parseBinanceStreamMessage(JSON.stringify({
    stream: "btcusdt@kline_15m",
    data: { e: "kline", k: { t: 1_700_000_000_000, o: "10", h: "12", l: "9", c: "11", v: "25" } },
  }));
  const ticker = parseBinanceStreamMessage(JSON.stringify({
    stream: "btcusdt@ticker",
    data: { e: "24hrTicker", s: "BTCUSDT", c: "11", p: "1", P: "10", h: "12", l: "8", q: "500", v: "50" },
  }));

  assert.deepEqual(candle?.candle, {
    time: 1_700_000_000,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volume: 25,
  });
  assert.equal(ticker?.ticker?.symbol, "BTCUSDT");
  assert.equal(ticker?.ticker?.priceChangePercent, 10);
  assert.equal(parseBinanceStreamMessage("invalid"), null);
});

test("historical candles prepend chronologically without duplicates", () => {
  const current = [
    { time: 3, open: 3, high: 3, low: 3, close: 3, volume: 3 },
    { time: 4, open: 4, high: 4, low: 4, close: 4, volume: 4 },
  ];
  const older = [
    { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 2, open: 2, high: 2, low: 2, close: 2, volume: 2 },
    { time: 3, open: 30, high: 30, low: 30, close: 30, volume: 30 },
  ];

  assert.deepEqual(prependCandleHistory(current, older).map((candle) => candle.time), [1, 2, 3, 4]);
});
