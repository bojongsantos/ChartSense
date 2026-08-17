import test from "node:test";
import assert from "node:assert/strict";
import { PLAN_CAPABILITIES, PREMIUM_PERIOD_DAYS } from "@/core/domain/access/plan-catalog";
import { getAlertLimit } from "@/core/domain/alerts/alert-rules";
import { FREE_JOURNAL_LIMIT, PREMIUM_JOURNAL_LIMIT } from "@/core/domain/access/journal";
import { hasFeature } from "@/core/domain/access/gating";
import { getWatchlistLimit } from "@/core/domain/access/watchlist";

function find(labelFragment: string) {
  const row = PLAN_CAPABILITIES.find((item) => item.label.includes(labelFragment));
  assert.ok(row, `missing pricing row for "${labelFragment}"`);
  return row;
}

test("advertised quantities match the limits the server enforces", () => {
  const watchlist = find("Watchlist");
  assert.equal(watchlist.free, `${getWatchlistLimit("FREE")} simbol`);
  assert.equal(watchlist.premium, `${getWatchlistLimit("PREMIUM")} simbol`);

  const alerts = find("Alert harga");
  assert.equal(alerts.free, `${getAlertLimit("free")} alert`);
  assert.equal(alerts.premium, `${getAlertLimit("premium")} alert`);

  const journal = find("Setup tersimpan");
  assert.equal(journal.free, `${FREE_JOURNAL_LIMIT} setup`);
  assert.equal(journal.premium, `${PREMIUM_JOURNAL_LIMIT} setup`);
});

test("gated rows mirror the entitlement gate rather than restating it", () => {
  const signals = find("Signals");
  assert.equal(signals.free, hasFeature("free", "signals"));
  assert.equal(signals.premium, hasFeature("premium", "signals"));
  // A premium-only feature must not be advertised as included in Free.
  assert.equal(signals.free, false);
  assert.equal(signals.premium, true);

  const scanner = find("scanner penuh");
  assert.equal(scanner.free, false);
  assert.equal(scanner.premium, true);
});

test("no row promises Free something Premium lacks", () => {
  for (const row of PLAN_CAPABILITIES) {
    if (typeof row.free === "boolean" && typeof row.premium === "boolean") {
      assert.ok(
        !(row.free && !row.premium),
        `"${row.label}" is offered to Free but not to Premium`,
      );
    }
  }
});

test("the billing period stated to buyers is 30 days", () => {
  // The webhook extends access by exactly this many days on settlement.
  assert.equal(PREMIUM_PERIOD_DAYS, 30);
});
