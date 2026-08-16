"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/presentation/ui/badge";

interface WatchlistItem { id: string; symbol: string; enabled: boolean; position: number }

export function WatchlistModule() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/watchlist", { cache: "no-store" });
    setLoading(false);
    if (response.status === 401) { setUnauthorized(true); return; }
    const payload = await response.json() as { items?: WatchlistItem[]; error?: { message?: string } };
    if (!response.ok) { setError(payload.error?.message ?? "Watchlist gagal dimuat."); return; }
    setItems(payload.items ?? []);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function add() {
    const symbol = draft.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,20}$/.test(symbol)) return;
    const response = await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
    const payload = await response.json() as { item?: WatchlistItem; error?: { message?: string } };
    if (!response.ok || !payload.item) { setError(payload.error?.message ?? "Simbol gagal ditambahkan."); return; }
    setItems((current) => [...current, payload.item!]); setDraft(""); setError(null);
  }

  async function toggle(item: WatchlistItem) {
    const response = await fetch(`/api/watchlist/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !item.enabled }) });
    if (response.ok) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry));
  }

  async function remove(id: string) {
    const response = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((entry) => entry.id !== id));
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted" /></div>;
  if (unauthorized) return <div className="m-6 card p-8 text-center"><h2 className="text-lg font-bold">Login diperlukan</h2><p className="mt-2 text-sm text-muted">Watchlist kini tersimpan aman pada akun.</p><Link href="/login?next=/watchlist" className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white">Masuk</Link></div>;

  return <div className="flex flex-col gap-5 p-6">
    <div><h2 className="text-lg font-bold">Watchlist Saya</h2><p className="mt-1 text-xs text-muted">{items.filter((item) => item.enabled).length} aktif dari {items.length} simbol.</p></div>
    <div className="flex gap-2"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} placeholder="BTCUSDT" className="min-w-0 flex-1 rounded-lg border border-border bg-surface-3 px-3 py-2 text-sm focus:border-accent/50 focus:outline-none" /><button onClick={() => void add()} disabled={!/^[A-Z0-9]{4,20}$/.test(draft.trim())} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Plus className="size-4" />Tambah</button></div>
    {error && <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-negative">{error}</p>}
    <div className="card divide-y divide-border/60 overflow-hidden">{items.length === 0 && <div className="p-8 text-center text-sm text-muted">Watchlist masih kosong.</div>}{items.map((item, index) => <div key={item.id} className="flex items-center gap-3 px-4 py-3"><span className="w-8 text-xs text-muted-2">#{index + 1}</span><span className="font-bold">{item.symbol}</span><span className="flex-1" /><Badge tone={item.enabled ? "positive" : "neutral"}>{item.enabled ? "Aktif" : "Nonaktif"}</Badge><button onClick={() => void toggle(item)} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold">{item.enabled ? "Nonaktifkan" : "Aktifkan"}</button><button onClick={() => void remove(item.id)} aria-label={`Hapus ${item.symbol}`} className="p-1.5 text-muted hover:text-negative"><Trash2 className="size-4" /></button></div>)}</div>
  </div>;
}
