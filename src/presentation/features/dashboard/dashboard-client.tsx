"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { isValidBinanceSymbol, mergeSearchableSymbols, normalizeUsdtSymbol } from "@/core/domain/market/symbol";
import type { Timeframe } from "@/core/domain/models";
import { fetchSearchableSymbols } from "@/infrastructure/market-data/symbol-catalog-client";
import { fetchEnabledWatchlist } from "@/infrastructure/persistence/watchlist-api-client";
import { AnalysisView } from "@/presentation/features/analysis/analysis-view";
import { SupplyDemandSection } from "@/presentation/features/dashboard/supply-demand-section";
import { useLiveAnalysis } from "@/presentation/hooks/use-live-analysis";
import { useTopSetups } from "@/presentation/hooks/use-scanner";
import { AppShell } from "@/presentation/layout/app-shell";
import { ChevronDown, Loader2, RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

export function DashboardClient() {
  const { top, loading: topLoading, error: topError } = useTopSetups(5);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [showTop, setShowTop] = useState(false);
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [query, setQuery] = useState("");

  // On a fresh mount, no session choice yet → auto-load today's #1 top setup.
  // Once the user picks a symbol it becomes the session choice (reset on the
  // next visit because state lives only in this component instance).
  const activeSymbol = symbol ?? top[0]?.hit.symbol ?? null;

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const [preferred, catalog] = await Promise.all([
        fetchEnabledWatchlist(),
        fetchSearchableSymbols(),
      ]);
      setSymbols(mergeSearchableSymbols(preferred, catalog));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const { analysis, loading, error } = useLiveAnalysis(activeSymbol ?? "BTCUSDT", timeframe);

  const currentTop = top.find((t) => t.hit.symbol === activeSymbol) ?? null;

  const pick = (value: string) => {
    const normalized = normalizeUsdtSymbol(value);
    if (!isValidBinanceSymbol(normalized)) return;
    setQuery(normalized.replace(/USDT$/i, ""));
    setSymbol(normalized);
    setShowTop(false);
  };

  const selectFromSection = (value: string) => {
    setQuery(value.replace(/USDT$/i, "").toUpperCase());
    setSymbol(value.toUpperCase());
    setShowTop(false);
  };

  const filtered = query.trim()
    ? symbols.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30)
    : symbols.slice(0, 20);

  return (
    <AppShell analysis={analysis}>
      <div className="flex flex-col gap-4 p-3 sm:p-6">
        {/* Supply & Demand Zones — new top section */}
        <SupplyDemandSection onSelect={selectFromSection} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-semibold text-muted">Symbol</label>
            <input
              list="symbol-options"
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                const match = symbols.find((s) => s.replace(/USDT$/, "").toUpperCase() === v.trim().toUpperCase());
                if (match) pick(match);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") pick(e.currentTarget.value);
              }}
              placeholder="Search symbol…"
              className="w-44 rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[12px] font-semibold text-foreground placeholder:text-muted-2 focus:border-accent/50 focus:outline-none"
            />
            <datalist id="symbol-options">
              {filtered.map((s) => (
                <option key={s} value={s.replace(/USDT$/, "")}>
                  {s}
                </option>
              ))}
            </datalist>

            {/* Today's #1 indicator chip */}
            {!symbol && currentTop && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent-2">
                <Sparkles className="size-3" />
                #1 today · Setup Score {currentTop.hit.setupScore}/100
              </span>
            )}

            {/* Top-5 setups dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTop((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-3 px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
              >
                Lihat top 5 setup lainnya
                <ChevronDown className="size-3.5" />
              </button>
              {showTop && (
                <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                    Top 5 setups hari ini
                  </p>
                  {topLoading && (
                    <div className="flex h-20 items-center justify-center text-muted-2">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  )}
                  {!topLoading &&
                    top.map((t) => {
                      const up = t.hit.direction === "long";
                      const Icon = up ? TrendingUp : TrendingDown;
                      const activeRow = t.hit.symbol === activeSymbol;
                      return (
                        <button
                          key={t.hit.symbol}
                          type="button"
                          onClick={() => pick(t.hit.symbol)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                            activeRow ? "bg-accent/10" : "hover:bg-surface-2"
                          }`}
                        >
                          <span className="w-5 text-[10px] font-bold tabular-nums text-muted-2">#{t.rank}</span>
                          <span className="w-20 truncate text-[12px] font-bold">{t.hit.symbol}</span>
                          <Icon className={`size-3.5 ${up ? "text-positive" : "text-negative"}`} />
                          <span className="ml-auto text-[11px] font-semibold tabular-nums text-accent-2">
                            {t.hit.setupScore}/100
                          </span>
                        </button>
                      );
                    })}
                  {!topLoading && top.length === 0 && (
                    <p className="px-2 py-3 text-center text-[11px] text-muted-2">Belum ada setup aktif.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-2">
              <Loader2 className="size-3.5 animate-spin" />
              Fetching live data…
            </span>
          )}
          {!loading && analysis && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-2">
              <RefreshCw className="size-3.5" />
              Live · auto-refresh 4s
            </span>
          )}
        </div>

        {(error || topError) && (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
            {(error ?? topError) as string}
          </div>
        )}

        {!analysis && !error && (
          <div className="flex h-64 items-center justify-center text-muted-2">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}

        {analysis && (
          <AnalysisView data={analysis} timeframe={timeframe} onTimeframeChange={setTimeframe} />
        )}
      </div>
    </AppShell>
  );
}
