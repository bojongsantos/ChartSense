"use client";

import type { PerformanceStats } from "@/core/domain/models";
import { DonutChart } from "@/presentation/ui/donut-chart";
import { LockedOverlay } from "@/presentation/ui/locked-overlay";

const colors = {
  positive: "var(--color-positive)",
  negative: "var(--color-negative)",
  neutral: "var(--color-muted-2)",
} as const;

export function PerformanceCard({ data }: { data: PerformanceStats }) {
  const donutSegments = data.breakdown.map((b) => ({
    label: b.label,
    value: b.value,
    color: colors[b.color],
  }));

  return (
    <section className="card flex flex-col p-4">
      <h3 className="text-[13px] font-semibold">Rule-based Backtest</h3>

      <LockedOverlay feature="historicalPerformance" className="mt-3 flex-1">
        <div className="flex items-center gap-4">
          <DonutChart
            segments={donutSegments}
            size={124}
            strokeWidth={13}
            centerLabel={`${data.successRate}%`}
            centerSub={data.totalTrades ? "Target 2" : "No sample"}
          />
          <div className="flex-1 space-y-2.5">
            {data.breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[12px] text-muted">
                  <span className="size-2 rounded-full" style={{ backgroundColor: colors[b.color] }} />
                  {b.label}
                </span>
                <span className="text-[12px] font-semibold tabular-nums">{b.value}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
              <span className="text-[12px] text-muted">Avg gain / loss</span>
              <span className="text-[12px] font-semibold tabular-nums">
                <span className="text-positive">+{data.avgGain}%</span>
                <span className="text-muted-2"> / </span>
                <span className="text-negative">-{data.avgLoss}%</span>
              </span>
            </div>
            <p className="text-[10px] text-muted-2">
              {data.totalTrades} resolved setups · Profit factor {data.profitFactor.toFixed(1)}
            </p>
          </div>
        </div>
      </LockedOverlay>
    </section>
  );
}
