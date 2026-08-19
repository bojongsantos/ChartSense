import test from "node:test";
import assert from "node:assert/strict";
import {
  planFor,
  resolveFeatureAccess,
} from "@/core/domain/access/entitlement-rules";
import { hasFeature, PREMIUM_FEATURES, type FeatureKey } from "@/core/domain/access/gating";

const PREMIUM_ONLY: FeatureKey = "signals";
const FREE_FEATURE: FeatureKey = "entryBreakdown";

test("with nothing recorded, the static plan defaults decide", () => {
  assert.equal(resolveFeatureAccess({ plan: "free", feature: PREMIUM_ONLY }), false);
  assert.equal(resolveFeatureAccess({ plan: "premium", feature: PREMIUM_ONLY }), true);
  assert.equal(resolveFeatureAccess({ plan: "free", feature: FREE_FEATURE }), true);

  // The fallback is the same table the rest of the app reads.
  for (const feature of PREMIUM_FEATURES) {
    assert.equal(
      resolveFeatureAccess({ plan: "free", feature }),
      hasFeature("free", feature),
    );
  }
});

test("a per-user grant overrides the plan in both directions", () => {
  // Opening a premium feature for one free account, without a release.
  assert.equal(
    resolveFeatureAccess({ plan: "free", feature: PREMIUM_ONLY, grant: { enabled: true } }),
    true,
  );

  // The direction that matters for safety: an explicit deny must beat a paid
  // plan, otherwise a single abusive account cannot be cut off.
  assert.equal(
    resolveFeatureAccess({ plan: "premium", feature: PREMIUM_ONLY, grant: { enabled: false } }),
    false,
  );
  assert.equal(
    resolveFeatureAccess({ plan: "premium", feature: FREE_FEATURE, grant: { enabled: false } }),
    false,
  );
});

test("a user grant wins over a deployment gate", () => {
  const gate = { free: false, premium: false };

  // The gate closes the feature for everyone; the grant reopens it for one.
  assert.equal(
    resolveFeatureAccess({ plan: "free", feature: PREMIUM_ONLY, grant: { enabled: true }, gate }),
    true,
  );

  const openGate = { free: true, premium: true };
  assert.equal(
    resolveFeatureAccess({
      plan: "premium",
      feature: PREMIUM_ONLY,
      grant: { enabled: false },
      gate: openGate,
    }),
    false,
  );
});

test("a gate decides per plan when no user grant exists", () => {
  const gate = { free: true, premium: false };
  assert.equal(resolveFeatureAccess({ plan: "free", feature: PREMIUM_ONLY, gate }), true);
  assert.equal(resolveFeatureAccess({ plan: "premium", feature: PREMIUM_ONLY, gate }), false);

  // A gate that closes a free feature really does close it, rather than
  // falling through to the permissive default.
  const closed = { free: false, premium: false };
  assert.equal(resolveFeatureAccess({ plan: "free", feature: FREE_FEATURE, gate: closed }), false);
});

test("an absent record is not mistaken for a denial", () => {
  // null and undefined both mean "nothing recorded", not "denied".
  assert.equal(
    resolveFeatureAccess({ plan: "premium", feature: PREMIUM_ONLY, grant: null, gate: null }),
    true,
  );
  assert.equal(
    resolveFeatureAccess({ plan: "premium", feature: PREMIUM_ONLY, grant: undefined }),
    true,
  );
});

test("only a stored PREMIUM plan is treated as paid", () => {
  assert.equal(planFor("PREMIUM"), "premium");
  assert.equal(planFor("FREE"), "free");
  // Anything unexpected falls back to the lower tier rather than upward.
  assert.equal(planFor(null), "free");
  assert.equal(planFor(undefined), "free");
  assert.equal(planFor("premium"), "free");
  assert.equal(planFor(""), "free");
});
