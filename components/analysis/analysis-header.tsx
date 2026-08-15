"use client";

import { CalendarDays, Plus, Share2 } from "lucide-react";
import type { PairSummary, Timeframe } from "@/lib/types";

interface AnalysisHeaderProps {
  pair: PairSummary;
  timeframe: Timeframe;
  exchange: string;
  analyzedAt: string;
}

export function AnalysisHeader({ pair, timeframe, exchange, analyzedAt }: AnalysisHeaderProps) {
  const date = new Date(analyzedAt);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-tight">{pair.symbol}</h1>
          <span className={`text-[13px] font-semibold ${pair.change24h >= 0 ? "text-positive" : "text-negative"}`}>
            {pair.change24h >= 0 ? "+" : ""}
            {pair.change24h.toFixed(2)}%
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          {pair.name} · {timeframe} · {exchange}
        </p>
      </div>

      <span className="ml-2 inline-flex items-center gap-1.5 text-[12px] text-muted-2">
        <CalendarDays className="size-3.5" />
        Analyzed {dateLabel}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-3 px-3.5 py-2 text-[12px] font-semibold text-foreground transition-colors hover:border-border-strong"
        >
          <Share2 className="size-3.5" />
          Share
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-blue px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-3.5" />
          New Analysis
        </button>
      </div>
    </div>
  );
}
