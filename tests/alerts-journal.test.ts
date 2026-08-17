import test from "node:test";
import assert from "node:assert/strict";
import { getAlertLimit, isAlertCondition, isAlertTriggered } from "@/core/domain/alerts/alert-rules";
import {
  priceWindowSince,
  resolveSetupOutcome,
  setupSignature,
  summarizeJournal,
  type JournalSetup,
} from "@/core/domain/journal/setup-outcome";

test("price alerts fire inclusively and reject unusable prices", () => {
  const above = { condition: "PRICE_ABOVE" as const, threshold: 100 };
  const below = { condition: "PRICE_BELOW" as const, threshold: 100 };

  assert.equal(isAlertTriggered(above, 101), true);
  assert.equal(isAlertTriggered(above, 99), false);
  assert.equal(isAlertTriggered(below, 99), true);
  assert.equal(isAlertTriggered(below, 101), false);

  // Touching the level exactly counts, otherwise a level can be crossed
  // between polls without the alert ever firing.
  assert.equal(isAlertTriggered(above, 100), true);
  assert.equal(isAlertTriggered(below, 100), true);

  assert.equal(isAlertTriggered(above, Number.NaN), false);
  assert.equal(isAlertTriggered({ condition: "PRICE_ABOVE", threshold: Number.NaN }, 100), false);
});

test("alert quota follows the plan and conditions are validated", () => {
  assert.equal(getAlertLimit("free"), 5);
  assert.equal(getAlertLimit("premium"), 100);
  assert.ok(getAlertLimit("premium") > getAlertLimit("free"));

  assert.ok(isAlertCondition("PRICE_ABOVE"));
  assert.equal(isAlertCondition("PRICE_SIDEWAYS"), false);
  assert.equal(isAlertCondition(null), false);
});

test("a long setup resolves against the range it has travelled", () => {
  const long: JournalSetup = { direction: "long", entry: 100, target1: 120, stopLoss: 90 };

  assert.equal(resolveSetupOutcome(long, { high: 110, low: 95 }), "OPEN");
  assert.equal(resolveSetupOutcome(long, { high: 125, low: 95 }), "TARGET_HIT");
  assert.equal(resolveSetupOutcome(long, { high: 110, low: 85 }), "STOPPED_OUT");
  // Touching the level exactly resolves the setup.
  assert.equal(resolveSetupOutcome(long, { high: 120, low: 95 }), "TARGET_HIT");
  assert.equal(resolveSetupOutcome(long, { high: 110, low: 90 }), "STOPPED_OUT");
});

test("a short setup resolves in the mirrored direction", () => {
  const short: JournalSetup = { direction: "short", entry: 100, target1: 80, stopLoss: 110 };

  assert.equal(resolveSetupOutcome(short, { high: 105, low: 90 }), "OPEN");
  assert.equal(resolveSetupOutcome(short, { high: 105, low: 75 }), "TARGET_HIT");
  assert.equal(resolveSetupOutcome(short, { high: 115, low: 90 }), "STOPPED_OUT");
});

test("an ambiguous range resolves against the trader, never in their favour", () => {
  const long: JournalSetup = { direction: "long", entry: 100, target1: 120, stopLoss: 90 };
  const short: JournalSetup = { direction: "short", entry: 100, target1: 80, stopLoss: 110 };

  // Both levels were touched; intra-bar order is unknowable, so the stop wins.
  assert.equal(resolveSetupOutcome(long, { high: 125, low: 85 }), "STOPPED_OUT");
  assert.equal(resolveSetupOutcome(short, { high: 115, low: 75 }), "STOPPED_OUT");
});

test("an unusable price range leaves the setup open", () => {
  const long: JournalSetup = { direction: "long", entry: 100, target1: 120, stopLoss: 90 };
  assert.equal(resolveSetupOutcome(long, { high: Number.NaN, low: 95 }), "OPEN");
  assert.equal(resolveSetupOutcome(long, { high: 110, low: Number.POSITIVE_INFINITY }), "OPEN");
});

test("the same plan produces one stable signature despite feed jitter", () => {
  const base = {
    symbol: "btcusdt",
    timeframe: "15m" as const,
    direction: "long" as const,
    entry: 100.000000001,
    stopLoss: 90,
  };

  assert.equal(setupSignature(base), setupSignature({ ...base, symbol: "BTCUSDT" }));
  assert.notEqual(setupSignature(base), setupSignature({ ...base, timeframe: "1H" }));
  assert.notEqual(setupSignature(base), setupSignature({ ...base, stopLoss: 91 }));
});

test("the evaluation window ignores price action that predates the setup", () => {
  const candles = [
    { time: 100, high: 500, low: 1 }, // before the setup existed
    { time: 200, high: 120, low: 80 },
    { time: 300, high: 130, low: 90 },
  ];

  // The spike to 500 on the first bar must not resolve a setup saved later.
  const window = priceWindowSince(candles, 200);
  assert.deepEqual(window, { high: 130, low: 80 });

  // A bar that merely straddles the save moment is excluded too, so a partial
  // bar cannot contribute movement from before the setup was recorded.
  assert.deepEqual(priceWindowSince(candles, 150), { high: 130, low: 80 });

  // No completed bar yet leaves the setup open rather than guessing.
  assert.equal(priceWindowSince(candles, 400), null);
  assert.equal(priceWindowSince([], 100), null);
});

test("journal statistics count only resolved setups in the win rate", () => {
  const stats = summarizeJournal([
    "TARGET_HIT",
    "TARGET_HIT",
    "STOPPED_OUT",
    "OPEN",
    "CANCELED",
  ]);

  assert.equal(stats.total, 5);
  assert.equal(stats.open, 1);
  assert.equal(stats.wins, 2);
  assert.equal(stats.losses, 1);
  // Open and cancelled setups must not dilute the rate.
  assert.equal(stats.winRate, 67);

  assert.equal(summarizeJournal([]).winRate, null);
  assert.equal(summarizeJournal(["OPEN", "CANCELED"]).winRate, null);
});
