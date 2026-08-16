import type { FeatureKey } from "@/core/domain/access/gating";
import type { Plan } from "@/core/domain/models";
import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";

export interface WatchlistItem {
  symbol: string;
  enabled: boolean;
}

export interface AdminConfig {
  watchlist: WatchlistItem[];
  plan: Plan;
  gateOverrides: Partial<Record<FeatureKey, boolean>>;
}

const STORAGE_KEY = "chartsense-admin-config";
const CONFIG_VERSION = 2;
export const ADMIN_CHANGE_EVENT = "chartsense:admin-change";

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  watchlist: DEFAULT_WATCHLIST.map((s) => ({ symbol: s, enabled: true })),
  plan: "free",
  gateOverrides: {},
};

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Merges a previously saved config with the current defaults.
 *
 * Older configs (before the top-200 watchlist) only stored ~12 symbols, which
 * would silently shrink the app back to that old list. This migration keeps
 * the user's saved selections but appends any default symbols that are missing
 * so the full watchlist is always available.
 */
function migrateConfig(parsed: Partial<AdminConfig>): AdminConfig {
  const defaults = DEFAULT_ADMIN_CONFIG.watchlist;
  const saved = Array.isArray(parsed.watchlist) ? parsed.watchlist : [];

  const bySymbol = new Map(defaults.map((w) => [w.symbol, w]));
  for (const w of saved) {
    if (bySymbol.has(w.symbol)) {
      bySymbol.set(w.symbol, w);
    } else {
      bySymbol.set(w.symbol, w);
    }
  }

  return {
    watchlist: [...bySymbol.values()],
    plan: parsed.plan === "pro" || parsed.plan === "free" ? parsed.plan : DEFAULT_ADMIN_CONFIG.plan,
    gateOverrides: parsed.gateOverrides ?? {},
  };
}

export function loadAdminConfig(): AdminConfig {
  if (!isBrowser()) return DEFAULT_ADMIN_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AdminConfig> & { version?: number };

    // Stale config from before the migration (no version or old version):
    // merge with defaults and persist the upgraded result.
    if (parsed.version !== CONFIG_VERSION) {
      const merged = migrateConfig(parsed);
      saveAdminConfig({ ...merged, version: CONFIG_VERSION });
      return merged;
    }

    return {
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : DEFAULT_ADMIN_CONFIG.watchlist,
      plan: parsed.plan === "pro" || parsed.plan === "free" ? parsed.plan : DEFAULT_ADMIN_CONFIG.plan,
      gateOverrides: parsed.gateOverrides ?? {},
    };
  } catch {
    return DEFAULT_ADMIN_CONFIG;
  }
}

export function saveAdminConfig(config: AdminConfig & { version?: number }): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, version: config.version ?? CONFIG_VERSION }));
    window.dispatchEvent(new CustomEvent(ADMIN_CHANGE_EVENT));
  } catch {
    // storage unavailable — ignore
  }
}

export function getEnabledWatchlist(config?: AdminConfig): string[] {
  const cfg = config ?? loadAdminConfig();
  return cfg.watchlist.filter((w) => w.enabled).map((w) => w.symbol);
}

export function getGateOverride(feature: FeatureKey, config?: AdminConfig): boolean | undefined {
  const cfg = config ?? loadAdminConfig();
  return cfg.gateOverrides[feature];
}

export function getPlan(config?: AdminConfig): Plan {
  const cfg = config ?? loadAdminConfig();
  return cfg.plan;
}
