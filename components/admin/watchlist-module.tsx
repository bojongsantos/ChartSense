"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_ADMIN_CONFIG, loadAdminConfig, saveAdminConfig, type WatchlistItem } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";

export function WatchlistModule() {
  const [config, setConfig] = useState(DEFAULT_ADMIN_CONFIG);
  const [draft, setDraft] = useState("");

  // Re-sync from localStorage after hydration to avoid SSR mismatch.
  useEffect(() => {
    const sync = () => setConfig(loadAdminConfig());
    sync();
    window.addEventListener("chartsense:admin-change", sync);
    return () => window.removeEventListener("chartsense:admin-change", sync);
  }, []);

  const commit = (next: WatchlistItem[]) => {
    const cfg = { ...config, watchlist: next };
    setConfig(cfg);
    saveAdminConfig(cfg);
  };

  const toggle = (symbol: string) => {
    commit(config.watchlist.map((w) => (w.symbol === symbol ? { ...w, enabled: !w.enabled } : w)));
  };

  const remove = (symbol: string) => {
    commit(config.watchlist.filter((w) => w.symbol !== symbol));
  };

  const add = () => {
    const symbol = draft.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,20}$/.test(symbol)) return;
    if (config.watchlist.some((w) => w.symbol === symbol)) {
      setDraft("");
      return;
    }
    commit([...config.watchlist, { symbol, enabled: true }]);
    setDraft("");
  };

  const reset = () => {
    const cfg = { ...loadAdminConfig() };
    setConfig(cfg);
    saveAdminConfig(cfg);
  };

  const enabled = config.watchlist.filter((w) => w.enabled).length;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Watchlist</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Daftar symbol yang discan di Scanner & halaman Analysis. {enabled} aktif dari {config.watchlist.length}.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
        >
          Reset ke default
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Tambahkan symbol, mis. PEPEUSDT"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-3 px-3 py-2 text-[12px] text-foreground placeholder:text-muted-2 focus:border-accent/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!/^[A-Z0-9]{4,20}$/.test(draft.trim())}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-blue px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          Tambah
        </button>
      </div>

      <div className="card divide-y divide-border/60 overflow-hidden">
        {config.watchlist.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-muted-2">
            Watchlist kosong. Tambahkan symbol untuk mulai scanning.
          </div>
        )}
        {config.watchlist.map((w) => (
          <div key={w.symbol} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-10 text-[11px] font-semibold tabular-nums text-muted-2">
              #{config.watchlist.indexOf(w) + 1}
            </span>
            <span className="text-[13px] font-bold">{w.symbol}</span>
            <span className="flex-1" />
            <Badge tone={w.enabled ? "positive" : "neutral"}>
              {w.enabled ? "Aktif" : "Nonaktif"}
            </Badge>
            <button
              type="button"
              onClick={() => toggle(w.symbol)}
              className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
            >
              {w.enabled ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button
              type="button"
              onClick={() => remove(w.symbol)}
              className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-2 transition-colors hover:border-negative/40 hover:text-negative"
              aria-label={`Hapus ${w.symbol}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
