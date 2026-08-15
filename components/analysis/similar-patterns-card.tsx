"use client";

import { FlaskConical } from "lucide-react";
import type { SimilarPatternHit } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { LockedOverlay } from "@/components/ui/locked-overlay";

const outcomeTone = {
  win: "positive",
  loss: "negative",
  pending: "neutral",
} as const;

const outcomeLabel = {
  win: "Win",
  loss: "Loss",
  pending: "Pending",
} as const;

export function SimilarPatternsCard({ data }: { data: SimilarPatternHit[] }) {
  return (
    <section className="card flex flex-col p-4">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="size-4 text-accent-2" />
        <h3 className="text-[13px] font-semibold">Similar Setups</h3>
        <Badge tone="neutral" className="ml-1">
          {data.length}
        </Badge>
      </div>

      <LockedOverlay feature="similarPatterns" className="mt-3 flex-1">
        <ul className="space-y-2">
          {data.map((hit) => (
            <li key={hit.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold tabular-nums">{hit.pair}</p>
                <p className="truncate text-[10px] text-muted-2">
                  {hit.pattern} · {hit.timeframe}
                </p>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-accent-2">{hit.confidence}%</span>
              <Badge tone={outcomeTone[hit.outcome]} className="w-16 justify-center">
                {hit.outcome === "pending" ? "Pending" : outcomeLabel[hit.outcome]}
              </Badge>
              <span
                className={`w-14 text-right text-[11px] font-semibold tabular-nums ${
                  hit.outcomePct > 0 ? "text-positive" : hit.outcomePct < 0 ? "text-negative" : "text-muted-2"
                }`}
              >
                {hit.outcomePct === 0 ? "—" : `${hit.outcomePct > 0 ? "+" : ""}${hit.outcomePct}%`}
              </span>
            </li>
          ))}
        </ul>
      </LockedOverlay>
    </section>
  );
}
