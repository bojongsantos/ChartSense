import type { SetupLockedSnapshot, SetupLockPort } from "@/core/domain/analysis/setup-lock";
import type { Timeframe } from "@/core/domain/models";

const PREFIX = "chartsense:setup-lock:";

export function setupLockKey(symbol: string, timeframe: Timeframe): string {
  return `${PREFIX}${symbol}:${timeframe}`;
}

export function loadSetupSnapshot(symbol: string, timeframe: Timeframe): SetupLockedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(setupLockKey(symbol, timeframe));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupLockedSnapshot;
    return parsed.algorithmVersion === 2 && parsed.symbol === symbol && parsed.timeframe === timeframe
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveSetupSnapshot(snapshot: SetupLockedSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(setupLockKey(snapshot.symbol, snapshot.timeframe), JSON.stringify(snapshot));
  } catch {
    // storage full / unavailable — the lock simply won't persist.
  }
}

export function clearSetupSnapshot(symbol: string, timeframe: Timeframe): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(setupLockKey(symbol, timeframe));
  } catch {
    // ignore
  }
}

export const browserSetupLockStore: SetupLockPort = {
  load: loadSetupSnapshot,
  save: saveSetupSnapshot,
  clear: clearSetupSnapshot,
};
