"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addWatchlistItem, fetchWatchlistItems, removeWatchlistItem, type WatchlistItemDto } from "@/infrastructure/persistence/watchlist-api-client";
import { usePlan } from "@/presentation/features/access/plan-provider";

export function useWatchlistMembership() {
  const { authenticated } = usePlan();
  const [items, setItems] = useState<WatchlistItemDto[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!authenticated) { setItems([]); return; }
      void fetchWatchlistItems().then(setItems).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authenticated]);

  const bySymbol = useMemo(() => new Map(items.map((item) => [item.symbol, item])), [items]);
  const toggle = useCallback(async (symbol: string) => {
    const normalized = symbol.toUpperCase();
    setPending((current) => new Set(current).add(normalized));
    setError(null);
    try {
      const existing = bySymbol.get(normalized);
      if (existing) {
        await removeWatchlistItem(existing.id);
        setItems((current) => current.filter((item) => item.id !== existing.id));
      } else {
        const item = await addWatchlistItem(normalized);
        setItems((current) => [...current, item]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPending((current) => { const next = new Set(current); next.delete(normalized); return next; });
    }
  }, [bySymbol]);

  return {
    authenticated,
    error,
    has: (symbol: string) => bySymbol.has(symbol.toUpperCase()),
    pending: (symbol: string) => pending.has(symbol.toUpperCase()),
    toggle,
  };
}

export type WatchlistMembership = ReturnType<typeof useWatchlistMembership>;
