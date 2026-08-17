import assert from "node:assert/strict";
import test from "node:test";
import { parseBinanceStreamMessage } from "@/infrastructure/market-data/binance-stream-client";

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
