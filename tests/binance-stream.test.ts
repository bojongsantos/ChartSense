import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRecentCandles,
  mergeCandleSeries,
  upsertLatestCandle,
} from "@/core/domain/market/candles";
import { parseBinanceStreamMessage } from "@/infrastructure/market-data/binance-stream-client";

test("Binance stream messages map to live candles and tickers", () => {
  const candle = parseBinanceStreamMessage(JSON.stringify({
    stream: "btcusdt@kline_15m",
    data: { e: "kline", s: "BTCUSDT", k: { t: 1_700_000_000_000, o: "10", h: "12", l: "9", c: "11", v: "25" } },
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
  assert.equal(candle?.symbol, "BTCUSDT");
  assert.equal(ticker?.ticker?.symbol, "BTCUSDT");
  assert.equal(ticker?.ticker?.priceChangePercent, 10);
  assert.equal(parseBinanceStreamMessage("invalid"), null);
});

test("historical candles merge chronologically, with live bars winning duplicates", () => {
  const current = [
    { time: 3, open: 3, high: 3, low: 3, close: 3, volume: 3 },
    { time: 4, open: 4, high: 4, low: 4, close: 4, volume: 4 },
  ];
  const older = [
    { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 2, open: 2, high: 2, low: 2, close: 2, volume: 2 },
    { time: 3, open: 30, high: 30, low: 30, close: 30, volume: 30 },
  ];

  const merged = mergeCandleSeries(older, current);

  assert.deepEqual(merged.map((candle) => candle.time), [1, 2, 3, 4]);
  // The live copy of bar 3 must survive, not the stale historical one.
  assert.equal(merged[2].close, 3);
});

test("a live update refreshes the forming bar and ignores stale frames", () => {
  const series = [
    { time: 10, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 20, open: 2, high: 2, low: 2, close: 2, volume: 2 },
  ];

  const refreshed = upsertLatestCandle(series, {
    time: 20, open: 2, high: 9, low: 2, close: 8, volume: 5,
  });
  assert.equal(refreshed.length, 2);
  assert.equal(refreshed[1].close, 8);

  const appended = upsertLatestCandle(series, {
    time: 30, open: 3, high: 3, low: 3, close: 3, volume: 3,
  });
  assert.deepEqual(appended.map((candle) => candle.time), [10, 20, 30]);

  const stale = upsertLatestCandle(series, {
    time: 10, open: 99, high: 99, low: 99, close: 99, volume: 99,
  });
  assert.deepEqual(stale, series);
});

test("a REST poll refreshes every bar it covers, including the one that just closed", () => {
  const series = [
    { time: 10, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    { time: 20, open: 2, high: 2, low: 2, close: 2, volume: 2 },
    { time: 30, open: 3, high: 3, low: 3, close: 3, volume: 3 },
  ];

  // Bar 30 settled at a different close than the last frame showed, and bar 40
  // opened. Both must land, not just the newest.
  const polled = applyRecentCandles(series, [
    { time: 30, open: 3, high: 7, low: 3, close: 6, volume: 9 },
    { time: 40, open: 4, high: 4, low: 4, close: 4, volume: 4 },
  ]);

  assert.deepEqual(polled.map((candle) => candle.time), [10, 20, 30, 40]);
  assert.equal(polled[2].close, 6);
  // Bars older than the batch are left exactly as they were.
  assert.deepEqual(polled.slice(0, 2), series.slice(0, 2));
  // The original series is never mutated in place.
  assert.equal(series.length, 3);
  assert.equal(series[2].close, 3);

  assert.deepEqual(applyRecentCandles(series, []), series);
});
