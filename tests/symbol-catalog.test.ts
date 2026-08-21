import assert from "node:assert/strict";
import test from "node:test";
import { filterSearchableSymbols, mergeSearchableSymbols } from "../src/core/domain/market/symbol";

test("removing a watchlist item does not remove it from the search catalog", () => {
  const symbols = mergeSearchableSymbols(["ETHUSDT"], ["BTCUSDT", "ETHUSDT", "PEPEUSDT"]);

  assert.deepEqual(symbols, ["ETHUSDT", "BTCUSDT", "PEPEUSDT"]);
  assert.ok(symbols.includes("BTCUSDT"));
});

test("watchlist search finds base assets and excludes saved symbols", () => {
  assert.deepEqual(filterSearchableSymbols(["BTCUSDT", "WBTCUSDT"], "btc"), ["BTCUSDT", "WBTCUSDT"]);

  const results = filterSearchableSymbols(
    ["BTCUSDT", "WBTCUSDT", "ETHUSDT", "BTCUSDC"],
    "btc",
    ["BTCUSDT"],
  );

  // BTCUSDC leads because its asset name starts with the query; WBTCUSDT only
  // contains it. Ordering by catalog position instead buried exact prefixes.
  assert.deepEqual(results, ["BTCUSDC", "WBTCUSDT"]);
});

test("a one-letter query reaches the asset that starts with it", () => {
  const catalog = ["PEPEUSDT", "DOGEUSDT", "ETHUSDT", "ENAUSDT", "AVAXUSDT"];
  assert.deepEqual(filterSearchableSymbols(catalog, "e"), [
    "ETHUSDT",
    "ENAUSDT",
    "PEPEUSDT",
    "DOGEUSDT",
  ]);
});

test("the result count stays capped after reordering", () => {
  const catalog = ["EAUSDT", "EBUSDT", "ECUSDT", "PEUSDT", "QEUSDT"];
  assert.deepEqual(filterSearchableSymbols(catalog, "e", [], 2), ["EAUSDT", "EBUSDT"]);
});
