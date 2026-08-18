import type { Plan } from "@/core/domain/models";

export type FeatureKey =
  | "entryBreakdown"
  | "historicalPerformance"
  | "similarPatterns"
  | "convictionDetail"
  | "scannerExtended"
  | "signals";

export const PREMIUM_FEATURES: FeatureKey[] = ["scannerExtended", "signals"];
export const PRO_FEATURES = PREMIUM_FEATURES;

const FREE_FEATURES: FeatureKey[] = [
  "entryBreakdown",
  "historicalPerformance",
  "similarPatterns",
  "convictionDetail",
];

const access: Record<Plan, Set<FeatureKey>> = {
  free: new Set(FREE_FEATURES),
  premium: new Set([...FREE_FEATURES, ...PREMIUM_FEATURES]),
};

export function hasFeature(plan: Plan, feature: FeatureKey, override?: boolean): boolean {
  if (override !== undefined) return override;
  return access[plan].has(feature);
}

export const featureLabel: Record<FeatureKey, string> = {
  entryBreakdown: "Entry, targets & invalidation levels",
  historicalPerformance: "Historical performance breakdown",
  similarPatterns: "Similar patterns found",
  convictionDetail: "Confidence score breakdown",
  scannerExtended: "Full scanner opportunities list",
  signals: "Signals — live supply & demand setups across the watchlist",
};
