"use client";

import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import type { MouseEvent } from "react";
import type { WatchlistMembership } from "@/presentation/hooks/use-watchlist-membership";

export function WatchlistToggleButton({ symbol, membership, nextPath }: { symbol: string; membership: WatchlistMembership; nextPath: string }) {
  const saved = membership.has(symbol);
  const loading = membership.pending(symbol);
  const stop = (event: MouseEvent) => event.stopPropagation();
  const className = `inline-flex size-7 items-center justify-center rounded-lg border transition-colors ${saved ? "border-warning/40 bg-warning/10 text-warning" : "border-border bg-surface-3 text-muted hover:text-warning"}`;

  if (!membership.authenticated) {
    return <Link href={`/login?next=${encodeURIComponent(nextPath)}`} onClick={stop} className={className} aria-label={`Masuk untuk menambahkan ${symbol} ke watchlist`} title="Masuk untuk simpan ke watchlist"><Star className="size-3.5" /></Link>;
  }

  return (
    <button
      type="button"
      onClick={(event) => { stop(event); void membership.toggle(symbol); }}
      disabled={loading}
      className={className}
      aria-label={`${saved ? "Hapus" : "Tambahkan"} ${symbol} ${saved ? "dari" : "ke"} watchlist`}
      title={saved ? "Hapus dari watchlist" : "Tambah ke watchlist"}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Star className={`size-3.5 ${saved ? "fill-current" : ""}`} />}
    </button>
  );
}
