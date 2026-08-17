"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Eye, Loader2, LockKeyhole, Plus, Search, Trash2 } from "lucide-react";
import type { SdMarketSnapshot, SdScanHit, SdScanResult } from "@/core/application/scanner/supply-demand-scan-service";
import { filterSearchableSymbols, normalizeUsdtSymbol } from "@/core/domain/market/symbol";
import { fetchSearchableSymbols } from "@/infrastructure/market-data/symbol-catalog-client";
import { Badge } from "@/presentation/ui/badge";
import { CoinIcon } from "@/presentation/ui/coin-icon";
import { formatCompact } from "@/shared/lib/format";

interface WatchlistItem {
  id: string;
  symbol: string;
  enabled: boolean;
  position: number;
}

interface SignalsPayload {
  result?: SdScanResult;
  error?: string;
}

const STATUS_TONES: Record<string, "warning" | "blue" | "positive" | "negative" | "neutral"> = {
  "Limit Order": "warning",
  Filled: "blue",
  Running: "positive",
  "Target 2 reached": "positive",
  "Invalidated (SL hit)": "negative",
  Missed: "neutral",
};

function statusTone(status?: string) {
  return STATUS_TONES[status ?? ""] ?? "neutral";
}

function VolumeBar({ volume, max }: { volume?: number; max: number }) {
  const percentage = volume == null ? 0 : Math.max(3, (volume / Math.max(max, 1)) * 100);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-blue/60 to-accent-blue"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-muted">
        {volume == null ? "—" : formatCompact(volume)}
      </span>
    </div>
  );
}

function Confidence({ signal }: { signal?: SdScanHit }) {
  if (!signal) return <span className="text-sm font-semibold text-muted-2">—</span>;
  const color = signal.direction === "long" ? "var(--color-positive)" : "var(--color-negative)";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{signal.confidence}%</span>
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ background: color, width: `${signal.confidence}%` }} />
      </div>
    </div>
  );
}

function WatchlistCard({
  item,
  market,
  signal,
  maxVolume,
  preview,
  onRemove,
}: {
  item: WatchlistItem;
  market?: SdMarketSnapshot;
  signal?: SdScanHit;
  maxVolume: number;
  preview: boolean;
  onRemove: (id: string) => void;
}) {
  const base = item.symbol.replace(/USDT$/, "");
  const change = market?.change24h;

  return (
    <article className="card overflow-hidden">
      <div className="hidden grid-cols-[minmax(180px,1.35fr)_minmax(150px,1fr)_minmax(130px,.9fr)_minmax(140px,.8fr)_68px] border-b border-border/60 bg-surface-2/40 text-[10px] font-semibold uppercase tracking-wide text-muted-2 md:grid">
        <span className="px-5 py-3">Pair</span>
        <span className="px-5 py-3">Volume 24H</span>
        <span className="px-5 py-3">Status</span>
        <span className="px-5 py-3">Confidence</span>
        <span className="sr-only">Aksi</span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(180px,1.35fr)_minmax(150px,1fr)_minmax(130px,.9fr)_minmax(140px,.8fr)_68px] md:items-center md:gap-0 md:p-0">
        <Link href={`/analysis?symbol=${encodeURIComponent(item.symbol)}`} className="flex items-center gap-3 md:px-5 md:py-5">
          <CoinIcon symbol={item.symbol} size={38} />
          <span>
            <span className="block text-base font-bold leading-tight hover:text-accent-2">
              {base}<span className="font-medium text-muted-2">/USDT</span>
            </span>
            <span className={`mt-1 block text-xs tabular-nums ${change == null ? "text-muted-2" : change >= 0 ? "text-positive" : "text-negative"}`}>
              {change == null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
            </span>
          </span>
        </Link>

        <div className="flex items-center justify-between md:block md:px-5 md:py-5">
          <span className="text-[10px] font-semibold uppercase text-muted-2 md:hidden">Volume 24H</span>
          <VolumeBar volume={market?.volume24h} max={maxVolume} />
        </div>
        <div className="flex items-center justify-between md:block md:px-5 md:py-5">
          <span className="text-[10px] font-semibold uppercase text-muted-2 md:hidden">Status</span>
          {signal?.status ? <Badge tone={statusTone(signal.status)}>{signal.status}</Badge> : <Badge tone="neutral">No Setup</Badge>}
        </div>
        <div className="flex items-center justify-between md:px-5 md:py-5">
          <span className="text-[10px] font-semibold uppercase text-muted-2 md:hidden">Confidence</span>
          <Confidence signal={signal} />
        </div>
        <div className="flex justify-end border-border/60 md:h-full md:items-center md:justify-center md:border-l">
          {preview ? (
            <LockKeyhole className="size-4 text-muted-2" aria-label="View-only" />
          ) : (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Hapus ${item.symbol}`}
              className="rounded-xl border border-negative/40 p-3 text-negative transition-colors hover:bg-negative/10"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function WatchlistModule() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [plan, setPlan] = useState<"FREE" | "PREMIUM" | null>(null);
  const [limit, setLimit] = useState(20);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<SdScanResult | null>(null);

  const load = useCallback(async () => {
    const [response, symbols] = await Promise.all([
      fetch("/api/watchlist", { cache: "no-store" }),
      fetchSearchableSymbols(),
    ]);
    setCatalog(symbols);
    setLoading(false);
    if (response.status === 401) {
      setUnauthorized(true);
      return;
    }
    const payload = await response.json() as { items?: WatchlistItem[]; plan?: "FREE" | "PREMIUM"; limit?: number; error?: { message?: string } };
    if (!response.ok) {
      setError(payload.error?.message ?? "Watchlist gagal dimuat.");
      return;
    }
    setItems(payload.items ?? []);
    setPlan(payload.plan ?? "FREE");
    setLimit(payload.limit ?? 20);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const symbolKey = items.map((item) => item.symbol).join(",");
  useEffect(() => {
    if (!symbolKey) return;
    const controller = new AbortController();
    void fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: symbolKey.split(",") }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as SignalsPayload;
        if (!response.ok || !payload.result) throw new Error(payload.error ?? "Data market gagal dimuat.");
        setScan(payload.result);
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Data market gagal dimuat.");
      })
    return () => controller.abort();
  }, [symbolKey]);

  async function add(value = draft) {
    if (!value.trim()) return;
    const symbol = normalizeUsdtSymbol(value);
    if (!catalog.includes(symbol) || items.some((item) => item.symbol === symbol)) return;
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    const payload = await response.json() as { item?: WatchlistItem; error?: { message?: string } };
    if (!response.ok || !payload.item) {
      setError(payload.error?.message ?? "Simbol gagal ditambahkan.");
      return;
    }
    setItems((current) => [...current, payload.item!]);
    setDraft("");
    setError(null);
  }

  async function remove(id: string) {
    const response = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((entry) => entry.id !== id));
  }

  const marketBySymbol = useMemo(
    () => new Map((scan?.market ?? []).map((market) => [market.symbol, market])),
    [scan],
  );
  const signalBySymbol = useMemo(
    () => new Map([...(scan?.demand ?? []), ...(scan?.supply ?? [])].map((signal) => [signal.symbol, signal])),
    [scan],
  );
  const maxVolume = Math.max(1, ...(scan?.market ?? []).map((market) => market.volume24h));
  const marketLoading = items.length > 0 && scan === null;

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted" /></div>;

  const itemSymbols = new Set(items.map((item) => item.symbol));
  const searchResults = filterSearchableSymbols(catalog, draft);
  const visibleSymbols = new Set(filterSearchableSymbols(items.map((item) => item.symbol), draft, [], items.length));
  const visibleItems = draft.trim() ? items.filter((item) => visibleSymbols.has(item.symbol)) : items;
  const selectedSymbol = draft.trim() ? normalizeUsdtSymbol(draft) : "";
  const canAdd = catalog.includes(selectedSymbol) && !itemSymbols.has(selectedSymbol) && items.length < limit;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Watchlist</h1>
            <p className="mt-2 text-xs text-muted">
              {unauthorized ? "Login untuk membuat watchlist pribadi." : `${items.length} dari ${limit} coin dipantau.`}
            </p>
          </div>
          {marketLoading && <span className="inline-flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3.5 animate-spin" /> Memuat market data</span>}
        </div>

        {!unauthorized && (
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-2" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && canAdd && void add()}
              placeholder="Cari coin di watchlist atau market..."
              role="combobox"
              aria-expanded={searchResults.length > 0}
              aria-controls="watchlist-search-results"
              className="w-full rounded-lg border border-border bg-surface-3 py-2.5 pl-10 pr-3 text-sm focus:border-accent/50 focus:outline-none"
            />
            {draft.trim() && (
              <div id="watchlist-search-results" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-2xl">
                {searchResults.map((symbol) => {
                  const saved = itemSymbols.has(symbol);
                  return (
                    <div key={symbol} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-3">
                      <Link href={`/analysis?symbol=${encodeURIComponent(symbol)}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <CoinIcon symbol={symbol} size={28} />
                        <span className="truncate text-sm font-bold">{symbol.replace(/USDT$/, "")}<span className="font-medium text-muted-2">/USDT</span></span>
                      </Link>
                      {saved ? (
                        <Badge tone="positive">Sudah tersimpan</Badge>
                      ) : (
                        <button type="button" onClick={() => void add(symbol)} disabled={items.length >= limit} className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"><Plus className="size-3.5" /> Tambah</button>
                      )}
                    </div>
                  );
                })}
                {searchResults.length === 0 && <p className="px-3 py-3 text-xs text-muted">Coin tidak ditemukan di market.</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {unauthorized && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><span className="rounded-lg bg-accent/15 p-2 text-accent-2"><Eye className="size-4" /></span><div><p className="text-sm font-bold">Mode view-only</p><p className="mt-1 text-xs text-muted">Analisis tetap dapat dilihat. Penyimpanan dan perubahan watchlist memerlukan akun.</p></div></div>
          <div className="flex gap-2 sm:ml-auto"><Link href="/login?next=/watchlist" className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold">Masuk</Link><Link href="/register" className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white">Daftar</Link></div>
        </div>
      )}

      {plan === "FREE" && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><span className="rounded-lg bg-accent/15 p-2 text-accent-2"><Crown className="size-4" /></span><div><p className="text-sm font-bold">Kapasitas watchlist</p><p className="mt-1 text-xs text-muted">Free dapat menyimpan 20 coin. Premium dapat menyimpan hingga 200 coin.</p></div></div>
          <Link href="/account" className="rounded-lg bg-gradient-to-r from-accent to-accent-blue px-4 py-2 text-center text-xs font-bold text-white sm:ml-auto">Upgrade Premium</Link>
        </div>
      )}

      {error && <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-negative">{error}</p>}

      <div className="flex flex-col gap-5">
        {items.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <Search className="size-8 text-muted-2" />
            <p className="mt-4 text-sm font-bold">Watchlist masih kosong</p>
            <p className="mt-1 max-w-sm text-xs text-muted">Cari dan tambahkan coin yang ingin kamu pantau.</p>
            {!unauthorized && <p className="mt-5 text-xs font-semibold text-accent-2">Gunakan kolom pencarian di atas.</p>}
          </div>
        )}
        {items.length > 0 && visibleItems.length === 0 && <div className="card p-8 text-center text-sm text-muted">Coin tidak ada di watchlist. Tambahkan melalui hasil pencarian market.</div>}
        {visibleItems.map((item) => (
          <WatchlistCard key={item.id} item={item} market={marketBySymbol.get(item.symbol)} signal={signalBySymbol.get(item.symbol)} maxVolume={maxVolume} preview={unauthorized} onRemove={(id) => void remove(id)} />
        ))}
      </div>
    </div>
  );
}
