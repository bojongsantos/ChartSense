import assert from "node:assert/strict";
import test from "node:test";
import { filterSearchableSymbols, mergeSearchableSymbols } from "../src/core/domain/market/symbol";

test("removing a watchlist item does not remove it from the search catalog", () => {
  const symbols = mergeSearchableSymbols(["ETHUSDT"], ["BTCUSDT", "ETHUSDT", "PEPEUSDT"]);

  assert.deepEqual(symbols, ["ETHUSDT", "BTCUSDT", "PEPEUSDT"]);
  assert.ok(symbols.includes("BTCUSDT"));
});

test("watchlist search finds base assets and excludes saved symbols", () => {
  const results = filterSearchableSymbols(
    ["BTCUSDT", "WBTCUSDT", "ETHUSDT", "BTCUSDC"],
    "btc",
    ["BTCUSDT"],
  );

  assert.deepEqual(results, ["WBTCUSDT", "BTCUSDC"]);
});
