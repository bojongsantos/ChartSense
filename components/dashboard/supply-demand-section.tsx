"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Layers, Loader2, RefreshCw } from "lucide-react";
import { useSdScan } from "@/lib/live";
import type { SdScanHit } from "@/lib/sd-recommendations";
import { usePlan } from "@/components/plan/plan-provider";
import { LockedOverlay } from "@/components/ui/locked-overlay";
import { Badge } from "@/components/ui/badge";

const FREE_VISIBLE = 3;
const SCROLL_MAX_HEIGHT = 400; // ~6 rows visible at once

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

function ZoneRow({ hit, onSelect }: { hit: SdScanHit; onSelect?: (symbol: string) => void }) {
  if (onSelect) {
    return (
      <button
        type="button"
        data-zone-row={hit.symbol}
        onClick={() => onSelect(hit.symbol)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
      >
        <span className="w-24 truncate text-[12px] font-bold">{hit.base}/USDT</span>
        <Badge tone="neutral" className="shrink-0">
          {hit.strength}
        </Badge>
        {hit.status && (
          <Badge tone={statusTone(hit.status)} className="shrink-0">
            {hit.status}
          </Badge>
        )}
        <Badge tone={hit.direction === "long" ? "positive" : "negative"} className="shrink-0">
          {hit.direction === "long" ? "Buy" : "Sell"}
        </Badge>
        <span className="flex-1" />
        <span className="text-[10px] tabular-nums text-muted-2">{hit.zones} zona</span>
        <span className="text-[11px] text-muted-2">conf {hit.confidence}%</span>
        <ArrowRight className="size-3.5 text-muted-2" />
      </button>
    );
  }
  return (
    <Link
      href={`/analysis?symbol=${hit.symbol}`}
      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
    >
      <span className="w-24 truncate text-[12px] font-bold">{hit.base}/USDT</span>
      <Badge tone="neutral" className="shrink-0">
        {hit.strength}
      </Badge>
      {hit.status && (
        <Badge tone={statusTone(hit.status)} className="shrink-0">
          {hit.status}
        </Badge>
      )}
      <Badge tone={hit.direction === "long" ? "positive" : "negative"} className="shrink-0">
        {hit.direction === "long" ? "Buy" : "Sell"}
      </Badge>
      <span className="flex-1" />
      <span className="text-[10px] tabular-nums text-muted-2">{hit.zones} zona</span>
      <span className="text-[11px] text-muted-2">conf {hit.confidence}%</span>
      <ArrowRight className="size-3.5 text-muted-2" />
    </Link>
  );
}

function ZoneCard({
  title,
  hits,
  tone,
  onSelect,
}: {
  title: string;
  hits: SdScanHit[];
  tone: "green" | "red";
  onSelect?: (symbol: string) => void;
}) {
  const { isPro } = usePlan();
  const color = tone === "green" ? "var(--color-positive)" : "var(--color-negative)";
  // Defensive: never mix directions — Buy table only shows long, Sell only short.
  const filtered = hits.filter((h) => (tone === "green" ? h.direction === "long" : h.direction === "short"));
  const total = filtered.length;
  const hasMore = total > FREE_VISIBLE;
  // Pro sees every setup in the scroll area; Free sees the first FREE_VISIBLE
  // and the rest blur inside the same scroll area.
  const visible = isPro ? filtered : filtered.slice(0, FREE_VISIBLE);
  const hidden = isPro ? [] : filtered.slice(FREE_VISIBLE);
  // Scroll only activates when the list overflows the fixed height.
  const scrollActive = total > FREE_VISIBLE;

  return (
    <section className="card flex flex-col p-6" style={{ borderRadius: 12 }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold tracking-tight" style={{ color }}>
          {title}
        </h3>
        <span className="text-[11px] text-muted-2">{total} setup</span>
      </div>

      {/* Internal scroll area — header/footer stay fixed outside this box */}
      <div
        className="mt-3 flex flex-col overflow-y-auto rounded-lg border border-border bg-surface"
        style={{
          maxHeight: scrollActive ? SCROLL_MAX_HEIGHT : undefined,
          scrollBehavior: "smooth",
          scrollbarColor: "var(--color-border-strong) transparent",
          scrollbarWidth: "thin",
        }}
      >
        {visible.length > 0 && (
          <div className="py-1">
            {visible.map((hit) => (
              <ZoneRow key={hit.symbol} hit={hit} onSelect={onSelect} />
            ))}
          </div>
        )}

        {hidden.length > 0 && (
          <LockedOverlay feature="scannerExtended" className="flex-1">
            <div className="py-1">
              {hidden.map((hit) => (
                <ZoneRow key={hit.symbol} hit={hit} onSelect={onSelect} />
              ))}
            </div>
          </LockedOverlay>
        )}

        {total === 0 && (
          <p className="px-3 py-5 text-center text-[11px] text-muted-2">Belum ada zona aktif.</p>
        )}
      </div>

      {hasMore && (
        <Link
          href="/patterns"
          className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
        >
          Lihat semua ({total})
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </section>
  );
}

export function SupplyDemandSection({ onSelect }: { onSelect?: (symbol: string) => void }) {
  const { result, loading, error, lastRun, refresh } = useSdScan();
  const sectionRef = useRef<HTMLElement>(null);
  const lastPickedRef = useRef<string | null>(null);

  // Scroll-to-select: as the user scrolls, the row nearest the horizontal
  // midline of this section becomes the active pair and auto-loads the chart
  // below (no click needed). Only active when an onSelect handler is present.
  useEffect(() => {
    if (!onSelect) return;

    const pickNearest = () => {
      const root = sectionRef.current;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      const midline = rootRect.top + rootRect.height / 2;

      let best: string | null = null;
      let bestDist = Infinity;
      root.querySelectorAll<HTMLElement>("[data-zone-row]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - midline);
        if (dist < bestDist) {
          bestDist = dist;
          best = el.getAttribute("data-zone-row");
        }
      });

      if (best && best !== lastPickedRef.current) {
        lastPickedRef.current = best;
        onSelect(best);
      }
    };

    const onScroll = () => requestAnimationFrame(pickNearest);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    // Initial pick after layout settles.
    const t = window.setTimeout(pickNearest, 200);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(t);
    };
  }, [onSelect, result]);

  return (
    <section ref={sectionRef} className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold">
            <Layers className="size-4.5 text-accent-2" />
            Signals
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Zona supply/demand aktif dari scan lintas watchlist (timeframe 4H).
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-blue px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {loading ? "Scanning…" : "Scan Semua"}
        </button>
      </div>

      {lastRun && (
        <p className="text-[11px] text-muted-2">
          Terakhir discan: {new Date(lastRun).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-[12px] text-warning">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex h-48 items-center justify-center text-muted-2">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ZoneCard title="Demand Zones (Buy)" hits={result.demand} tone="green" onSelect={onSelect} />
          <ZoneCard title="Supply Zones (Sell)" hits={result.supply} tone="red" onSelect={onSelect} />
        </div>
      )}
    </section>
  );
}
