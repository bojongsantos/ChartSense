import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";

export async function fetchSearchableSymbols(): Promise<string[]> {
  try {
    const response = await fetch("/api/symbols");
    if (!response.ok) return DEFAULT_WATCHLIST;
    const payload = await response.json() as { symbols?: string[] };
    return payload.symbols?.length ? payload.symbols : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}
