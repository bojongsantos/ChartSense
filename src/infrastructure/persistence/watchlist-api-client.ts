import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";

export interface WatchlistItemDto {
  id: string;
  symbol: string;
  enabled: boolean;
  position: number;
}

export async function fetchWatchlistItems(): Promise<WatchlistItemDto[]> {
  const response = await fetch("/api/watchlist", { cache: "no-store" });
  const payload = await response.json() as { items?: WatchlistItemDto[]; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "Watchlist gagal dimuat.");
  return payload.items ?? [];
}

export async function addWatchlistItem(symbol: string): Promise<WatchlistItemDto> {
  const response = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  });
  const payload = await response.json() as { item?: WatchlistItemDto; error?: { message?: string } };
  if (!response.ok || !payload.item) throw new Error(payload.error?.message ?? "Coin gagal ditambahkan.");
  return payload.item;
}

export async function removeWatchlistItem(id: string): Promise<void> {
  const response = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const payload = await response.json() as { error?: { message?: string } };
    throw new Error(payload.error?.message ?? "Coin gagal dihapus.");
  }
}

export async function fetchEnabledWatchlist(): Promise<string[]> {
  try {
    const items = await fetchWatchlistItems();
    const symbols = items.filter((item) => item.enabled).map((item) => item.symbol);
    return symbols.length ? symbols : DEFAULT_WATCHLIST;
  } catch {
    return DEFAULT_WATCHLIST;
  }
}
