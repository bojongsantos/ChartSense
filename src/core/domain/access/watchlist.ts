import type { SubscriptionPlan } from "@/core/domain/identity";

export const FREE_WATCHLIST_LIMIT = 20;
export const PREMIUM_WATCHLIST_LIMIT = 200;

export function getWatchlistLimit(plan: SubscriptionPlan): number {
  return plan === "PREMIUM" ? PREMIUM_WATCHLIST_LIMIT : FREE_WATCHLIST_LIMIT;
}
