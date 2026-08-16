import test from "node:test";
import assert from "node:assert/strict";
import { hasFeature } from "@/core/domain/access/gating";
import { FREE_WATCHLIST_LIMIT, getWatchlistLimit, PREMIUM_WATCHLIST_LIMIT } from "@/core/domain/access/watchlist";

test("Free and Premium entitlements remain separated", () => {
  assert.equal(hasFeature("free", "scannerExtended"), false);
  assert.equal(hasFeature("free", "signals"), false);
  assert.equal(hasFeature("premium", "scannerExtended"), true);
  assert.equal(hasFeature("premium", "signals"), true);
  assert.equal(hasFeature("free", "signals", true), true);
  assert.equal(hasFeature("premium", "signals", false), false);
});

test("watchlist limits follow the subscription plan", () => {
  assert.equal(getWatchlistLimit("FREE"), FREE_WATCHLIST_LIMIT);
  assert.equal(getWatchlistLimit("PREMIUM"), PREMIUM_WATCHLIST_LIMIT);
  assert.equal(FREE_WATCHLIST_LIMIT, 20);
  assert.equal(PREMIUM_WATCHLIST_LIMIT, 200);
});
