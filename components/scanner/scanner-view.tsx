"use client";

import { Loader2, Radar } from "lucide-react";
import type { ScannerOpportunity } from "@/lib/types";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/ui/locked-overlay";
import { OpportunityCard } from "@/components/scanner/opportunity-card";

const FREE_VISIBLE = 2;

interface ScannerViewProps {
  data: ScannerOpportunity[];
  loading?: boolean;
  onRun?: () => void;
}

export function ScannerView({ data, loading, onRun }: ScannerViewProps) {
  const { isPro } = usePlan();
  const visible = isPro ? data : data.slice(0, FREE_VISIBLE);
  const hidden = isPro ? [] : data.slice(FREE_VISIBLE);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold">
            <Radar className="size-4.5 text-accent-2" />
            AI Scanner – Best Opportunities Today
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Real-time pattern scan across {data.length} pairs on Binance.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {loading ? "Scanning…" : "Run Scanner"}
        </button>
      </div>

      {data.length === 0 && !loading && (
        <div className="rounded-lg border border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted-2">
          No setups detected right now. Click “Run Scanner” to rescan the market.
        </div>
      )}

      <div className="-mx-6 overflow-x-auto px-6 pb-1">
        <div className="flex gap-4">
          {visible.map((opp) => (
            <OpportunityCard key={opp.rank} data={opp} />
          ))}
          {!isPro && hidden.length > 0 && (
            <LockedOverlay feature="scannerExtended" className="flex gap-4">
              {hidden.map((opp) => (
                <OpportunityCard key={opp.rank} data={opp} />
              ))}
            </LockedOverlay>
          )}
        </div>
      </div>
    </section>
  );
}
