"use client";

import { CheckCircle2, Info, ShieldAlert, XCircle } from "lucide-react";
import type { ConvictionScore } from "@/lib/conviction";
import { LockedOverlay } from "@/components/ui/locked-overlay";

const toneIcon = {
  pass: { Icon: CheckCircle2, className: "text-positive" },
  warn: { Icon: ShieldAlert, className: "text-warning" },
  fail: { Icon: XCircle, className: "text-negative" },
  info: { Icon: Info, className: "text-muted-2" },
};

export function ConvictionScoreCard({ data }: { data: ConvictionScore }) {
  const waiting = data.score === 0 && data.grade === "F";

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Conviction Score</h3>
        <span className="rounded-md border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[11px] font-bold text-accent-2">
          {waiting ? "—" : data.grade}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        {waiting ? (
          <span className="text-lg font-semibold text-muted-2">Waiting for live data</span>
        ) : (
          <>
            <span className="text-3xl font-bold leading-none text-accent-blue">{data.score}</span>
            <span className="text-sm font-medium text-muted-2">/ 100</span>
          </>
        )}
      </div>

      {!waiting && (
        <p className="mt-1 text-[11px] leading-snug text-muted">{data.interpretation}</p>
      )}

      <LockedOverlay feature="convictionDetail" className="mt-3">
        <ul className="space-y-2.5">
          {data.components.map((comp) => {
            const { Icon, className } = toneIcon[comp.tone];
            return (
              <li key={comp.id} className="flex items-center gap-2.5">
                <Icon className={`size-4 shrink-0 ${className}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-foreground">{comp.label}</p>
                  <p className="truncate text-[10px] text-muted-2">{comp.detail}</p>
                </div>
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    comp.value > 0 ? "text-positive" : comp.value < 0 ? "text-negative" : "text-foreground"
                  }`}
                >
                  {comp.display}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[10px] text-muted-2">Skor berada di rentang 20-96 (tidak pernah 100% pasti)</p>
      </LockedOverlay>
    </section>
  );
}
