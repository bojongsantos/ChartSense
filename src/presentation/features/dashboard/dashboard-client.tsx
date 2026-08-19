"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import type { HistoryRange } from "@/core/application/market-data/history-plan";
import { isValidBinanceSymbol, mergeSearchableSymbols, normalizeUsdtSymbol } from "@/core/domain/market/symbol";
import type { Timeframe } from "@/core/domain/models";
import { fetchSearchableSymbols } from "@/infrastructure/market-data/symbol-catalog-client";
import { fetchEnabledWatchlist } from "@/infrastructure/persistence/watchlist-api-client";
import { AnalysisView } from "@/presentation/features/analysis/analysis-view";
import { SupplyDemandSection } from "@/presentation/features/dashboard/supply-demand-section";
import { useLiveAnalysis } from "@/presentation/hooks/use-live-analysis";
import { useTopSetups } from "@/presentation/hooks/use-scanner";
import { useWatchlistMembership } from "@/presentation/hooks/use-watchlist-membership";
import { AppShell } from "@/presentation/layout/app-shell";
import { WatchlistToggleButton } from "@/presentation/ui/watchlist-toggle-button";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { CoinIcon } from "@/presentation/ui/coin-icon";

export function DashboardClient() {
  const { top, loading: topLoading, error: topError } = useTopSetups(5);
  const membership = useWatchlistMembership();
  const [symbol, setSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [range, setRange] = useState<HistoryRange>("3M");
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

  const { analysis, loading, error, streamStatus, history, loadMoreHistory } = useLiveAnalysis(
    activeSymbol ?? "BTCUSDT",
    timeframe,
    range,
  );

  const currentTop = top.find((t) => t.hit.symbol === activeSymbol) ?? null;

  const pick = (value: string) => {
    const normalized = normalizeUsdtSymbol(value);
    if (!isValidBinanceSymbol(normalized)) return;
    setQuery(normalized.replace(/USDT$/i, ""));
    setSymbol(normalized);
  };

  const selectFromSection = (value: string) => {
    setQuery(value.replace(/USDT$/i, "").toUpperCase());
    setSymbol(value.toUpperCase());
  };

  const filtered = query.trim()
    ? symbols.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30)
    : symbols.slice(0, 20);

  return (
    <AppShell analysis={analysis}>
      <div className="flex flex-col gap-4 p-3 sm:p-6">
        {/* Supply & Demand Zones — new top section */}
        <SupplyDemandSection onSelect={selectFromSection} membership={membership} />

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
                #1 hari ini · Confidence {Math.round(currentTop.hit.confidence)}%
              </span>
            )}

            {activeSymbol && <WatchlistToggleButton symbol={activeSymbol} membership={membership} nextPath="/" />}
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
              {streamStatus === "live" ? "Live · realtime stream" : "Live · reconnecting"}
            </span>
          )}
        </div>

        {/* Top 5 setup — always visible; hiding it behind a toggle meant the
            single most useful thing on the page cost a click to reach. */}
        <section className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide">Top 5 setup hari ini</p>
            <span className="text-[10px] text-muted-2">diurutkan berdasarkan confidence</span>
          </div>

          {topLoading && (
            <div className="flex h-20 items-center justify-center text-muted-2">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}

          {!topLoading && top.length === 0 && (
            <p className="py-6 text-center text-[11px] text-muted-2">Belum ada setup aktif.</p>
          )}

          {!topLoading && top.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {top.map((t) => {
                const up = t.hit.direction === "long";
                const activeCard = t.hit.symbol === activeSymbol;
                const confidence = Math.round(t.hit.confidence);
                return (
                  <button
                    key={t.hit.symbol}
                    type="button"
                    onClick={() => pick(t.hit.symbol)}
                    className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      activeCard
                        ? "border-accent/50 bg-accent/10"
                        : "border-border bg-surface-2 hover:border-accent/30 hover:bg-surface-3"
                    }`}
                  >
                    <span className="w-3 shrink-0 text-[10px] font-bold tabular-nums text-muted-2">
                      {t.rank}
                    </span>
                    <CoinIcon symbol={t.hit.symbol} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold leading-tight">
                        {t.hit.base}
                      </span>
                      <span
                        className={`mt-0.5 inline-block rounded border px-1 py-px text-[9px] font-bold uppercase leading-none ${
                          up
                            ? "border-positive/40 bg-positive/10 text-positive"
                            : "border-negative/40 bg-negative/10 text-negative"
                        }`}
                      >
                        {up ? "Long" : "Short"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-bold leading-none tabular-nums ${
                        confidence >= 70
                          ? "text-positive"
                          : confidence >= 45
                            ? "text-warning"
                            : "text-muted"
                      }`}
                    >
                      {confidence}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

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
          <AnalysisView
            data={analysis}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            range={range}
            onRangeChange={setRange}
            history={history}
            onLoadMoreHistory={loadMoreHistory}
          />
        )}
      </div>
    </AppShell>
  );
}
