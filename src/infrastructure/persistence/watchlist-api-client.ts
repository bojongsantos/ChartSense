import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";

export async function fetchEnabledWatchlist(): Promise<string[]> {
  try {
    const response = await fetch("/api/watchlist", { cache: "no-store" });
    if (!response.ok) return DEFAULT_WATCHLIST;
    const payload = await response.json() as { items?: { symbol: string; enabled: boolean }[] };
    const symbols = payload.items?.filter((item) => item.enabled).map((item) => item.symbol) ?? [];
    return symbols.length ? symbols : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}
