"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AnalysisView } from "@/components/analysis/analysis-view";
import { useLiveAnalysis } from "@/lib/live";
import { resolveWatchlist } from "@/lib/scanner-engine";
import { WATCHLIST } from "@/lib/scanner-engine";
import type { Timeframe } from "@/lib/types";
import { Loader2, RefreshCw } from "lucide-react";

export function AnalysisClient({ initialSymbol }: { initialSymbol: string }) {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [symbols, setSymbols] = useState<string[]>(WATCHLIST);
  const [query, setQuery] = useState(initialSymbol.replace(/USDT$/, ""));
  const { analysis, loading, error } = useLiveAnalysis(symbol, timeframe);

  // Apply admin watchlist after hydration (avoids SSR/localStorage mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSymbols(resolveWatchlist());
  }, []);

  const filtered = query.trim()
    ? symbols.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30)
    : symbols.slice(0, 20);

  const pick = (value: string) => {
    setQuery(value.replace(/USDT$/i, "").toUpperCase());
    setSymbol(`${value.toUpperCase()}USDT`);
  };

  return (
    <AppShell analysis={analysis}>
      <div className="flex flex-col gap-4 p-6">
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
                if (match) setSymbol(match);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) pick(filtered[0]);
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
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="hidden"
              aria-hidden="true"
            >
              {symbols.map((s) => (
                <option key={s} value={s} />
              ))}
            </select>
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

        {error && (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
            Failed to load {symbol}: {error}
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
