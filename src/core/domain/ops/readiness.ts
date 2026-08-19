export type ReadinessLevel = "ready" | "blocked";

export interface CapabilityReport {
  id: string;
  name: string;
  level: ReadinessLevel;
  /** Environment variables this capability cannot work without. */
  requires: string[];
  /** The ones that are absent. Empty when ready. */
  missing: string[];
  /** What stops working for users while it is missing. */
  impact: string;
}

interface Capability {
  id: string;
  name: string;
  requires: string[];
  impact: string;
}

/**
 * Capabilities that depend on configuration rather than on code.
 *
 * Each entry names the variables it cannot work without and, more usefully,
 * what a user loses while they are absent. A missing key never announces
 * itself: the deployment builds, the pages render, and only the person who
 * tries to pay or reset a password ever finds out.
 */
const CAPABILITIES: Capability[] = [
  {
    id: "database",
    name: "Database",
    requires: ["DATABASE_URL"],
    impact: "Login, watchlist, alert, dan pembayaran seluruhnya berhenti.",
  },
  {
    id: "auth",
    name: "Autentikasi",
    requires: ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
    impact: "Pengguna tidak dapat masuk atau mendaftar.",
  },
  {
    id: "payments",
    name: "Pembayaran",
    requires: ["MIDTRANS_SERVER_KEY"],
    impact: "Checkout membalas 503 dan tidak ada yang dapat membeli Premium.",
  },
  {
    id: "email",
    name: "Email transaksional",
    requires: ["RESEND_API_KEY", "EMAIL_FROM"],
    impact: "Reset password gagal, dan verifikasi email tidak pernah terkirim.",
  },
  {
    id: "alerts",
    name: "Sweep alert terjadwal",
    requires: ["CRON_SECRET"],
    impact: "Endpoint cron membalas 503, sehingga alert harga tidak pernah dievaluasi.",
  },
];

/**
 * Reports which configured capabilities are actually usable.
 *
 * Takes the set of variable names that hold a non-empty value, never the
 * values themselves, so a report can be produced and logged without carrying
 * secrets along with it.
 */
export function assessReadiness(presentKeys: Iterable<string>): CapabilityReport[] {
  const present = new Set(presentKeys);
  return CAPABILITIES.map((capability) => {
    const missing = capability.requires.filter((key) => !present.has(key));
    return {
      id: capability.id,
      name: capability.name,
      level: missing.length === 0 ? "ready" : "blocked",
      requires: capability.requires,
      missing,
      impact: capability.impact,
    };
  });
}

/** True when every capability has what it needs. */
export function isFullyConfigured(reports: readonly CapabilityReport[]): boolean {
  return reports.every((report) => report.level === "ready");
}

/** Names of the variables that must be supplied before the app is complete. */
export function missingKeys(reports: readonly CapabilityReport[]): string[] {
  return [...new Set(reports.flatMap((report) => report.missing))];
}
