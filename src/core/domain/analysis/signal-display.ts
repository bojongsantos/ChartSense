import type { SdScanHit } from "@/core/application/scanner/supply-demand-scan-service";

/**
 * Confidence a setup must clear before the dashboard lists it.
 *
 * The detector emits a setup for every zone it can still see, including ones
 * it barely believes in — a 20% reading means "this is technically a zone",
 * not "consider this". Showing those alongside genuine setups made the list
 * long and the good entries hard to pick out, so the dashboard now carries
 * only setups the detector is more sure of than not.
 *
 * Deliberately a threshold rather than a cap on row count: filtering by rank
 * would always show something, even on a day when nothing qualifies.
 */
export const MIN_DASHBOARD_CONFIDENCE = 50;

/** True when a setup is confident enough for the dashboard. */
export function isDashboardSignal(hit: Pick<SdScanHit, "confidence">): boolean {
  return hit.confidence > MIN_DASHBOARD_CONFIDENCE;
}

/** The subset of a scan the dashboard is allowed to show. */
export function dashboardSignals<T extends Pick<SdScanHit, "confidence">>(hits: readonly T[]): T[] {
  return hits.filter(isDashboardSignal);
}
