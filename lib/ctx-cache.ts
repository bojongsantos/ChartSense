import { isBrowser } from "./admin";

const PREFIX = "chartsense:ctx-cache:";

interface CacheEntry<T> {
  ts: number;
  data: T;
}

/** Read a value from localStorage if it is still within its TTL. */
export function readCache<T>(key: string, ttlMs: number): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/** Write a value to localStorage with the current timestamp. */
export function writeCache<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    const entry: CacheEntry<T> = { ts: Date.now(), data };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // storage full / unavailable — cache simply won't persist.
  }
}
