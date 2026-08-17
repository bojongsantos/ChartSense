import type { SubscriptionPlan } from "@/core/domain/identity";

export const FREE_JOURNAL_LIMIT = 50;
export const PREMIUM_JOURNAL_LIMIT = 500;

/**
 * Journal entries a plan may hold.
 *
 * This is a safety limit as much as a plan feature: every open entry is work
 * the scheduled sweep performs on behalf of the account, so an uncapped
 * journal lets one user slow the sweep down for everyone.
 */
export function getJournalLimit(plan: SubscriptionPlan): number {
  return plan === "PREMIUM" ? PREMIUM_JOURNAL_LIMIT : FREE_JOURNAL_LIMIT;
}

/** Notifications retained per user; older ones are pruned by the sweep. */
export const NOTIFICATION_RETENTION = 200;
