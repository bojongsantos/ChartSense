import { hasFeature, type FeatureKey } from "@/core/domain/access/gating";
import type { Plan } from "@/core/domain/models";

/** A per-user override, when one has been recorded for this feature. */
export interface FeatureGrant {
  enabled: boolean;
}

/** A deployment-wide switch, when one has been recorded for this feature. */
export interface FeatureGate {
  free: boolean;
  premium: boolean;
}

export interface AccessQuestion {
  plan: Plan;
  feature: FeatureKey;
  grant?: FeatureGrant | null;
  gate?: FeatureGate | null;
}

/**
 * Decides whether a plan may use a feature, in three tiers.
 *
 * A per-user grant wins outright, including when it says no: an explicit deny
 * is how a single abusive account is cut off without touching anyone else, so
 * it has to override a paid plan rather than be merged with it.
 *
 * A deployment-wide gate comes next, letting a feature be opened or closed for
 * a whole plan without a release.
 *
 * With neither recorded, the static plan defaults apply.
 */
export function resolveFeatureAccess(question: AccessQuestion): boolean {
  if (question.grant) return question.grant.enabled;
  if (question.gate) {
    return question.plan === "premium" ? question.gate.premium : question.gate.free;
  }
  return hasFeature(question.plan, question.feature);
}

/** Anonymous visitors are treated as the free plan. */
export function planFor(storedPlan: string | null | undefined): Plan {
  return storedPlan === "PREMIUM" ? "premium" : "free";
}
