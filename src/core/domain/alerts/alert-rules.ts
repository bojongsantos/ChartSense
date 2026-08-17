import type { Plan } from "@/core/domain/models";
import { formatPrice, priceDecimals } from "@/shared/lib/format";

export type AlertCondition = "PRICE_ABOVE" | "PRICE_BELOW";
export type AlertStatus = "ACTIVE" | "TRIGGERED" | "PAUSED";

export const ALERT_CONDITIONS: readonly AlertCondition[] = ["PRICE_ABOVE", "PRICE_BELOW"];

/** How many alerts a plan may keep armed at once. */
const ALERT_LIMIT: Record<Plan, number> = {
  free: 5,
  premium: 100,
};

export function getAlertLimit(plan: Plan): number {
  return ALERT_LIMIT[plan];
}

export function isAlertCondition(value: unknown): value is AlertCondition {
  return typeof value === "string" && ALERT_CONDITIONS.includes(value as AlertCondition);
}

export interface AlertTrigger {
  condition: AlertCondition;
  threshold: number;
}

/**
 * Whether the market has satisfied an alert. Comparisons are inclusive: an
 * alert set at exactly the traded price has been reached, and treating it
 * otherwise would let a level be crossed without ever firing.
 */
export function isAlertTriggered(trigger: AlertTrigger, price: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(trigger.threshold)) return false;
  return trigger.condition === "PRICE_ABOVE"
    ? price >= trigger.threshold
    : price <= trigger.threshold;
}

export function describeAlertCondition(condition: AlertCondition): string {
  return condition === "PRICE_ABOVE" ? "naik ke" : "turun ke";
}

/** Human-readable line used for the notification body. */
export function describeAlert(
  symbol: string,
  trigger: AlertTrigger,
  price: number,
): string {
  const decimals = priceDecimals(trigger.threshold);
  return `${symbol} ${describeAlertCondition(trigger.condition)} $${formatPrice(
    trigger.threshold,
    decimals,
  )} — harga sekarang $${formatPrice(price, decimals)}.`;
}
