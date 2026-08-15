import { isBrowser } from "./admin";

export type SetupLockZoneType = "supply" | "demand";
export type SetupLockDirection = "long" | "short";

/**
 * Immutable snapshot of a setup taken the moment it first transitions to
 * "Running". Once persisted, every later evaluation reuses these exact values
 * so entry / SL / T1 / T2 never drift between scans.
 */
export interface SetupLockedSnapshot {
  symbol: string;
  zoneType: SetupLockZoneType;
  direction: SetupLockDirection;
  baseTime: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  confidence: number;
  zoneTop: number;
  zoneBottom: number;
  narrowness: number;
  strength: "fresh" | "tested" | "broken";
  touches: number;
  runningSince: number;
}

const PREFIX = "chartsense:setup-lock:";

export function setupLockKey(symbol: string): string {
  return PREFIX + symbol;
}

export function loadSetupSnapshot(symbol: string): SetupLockedSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(setupLockKey(symbol));
    return raw ? (JSON.parse(raw) as SetupLockedSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveSetupSnapshot(snapshot: SetupLockedSnapshot): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(setupLockKey(snapshot.symbol), JSON.stringify(snapshot));
  } catch {
    // storage full / unavailable — the lock simply won't persist.
  }
}

export function clearSetupSnapshot(symbol: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(setupLockKey(symbol));
  } catch {
    // ignore
  }
}
