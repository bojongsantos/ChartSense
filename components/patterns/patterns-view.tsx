"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSdScan } from "@/lib/live";
import type { SdScanHit } from "@/lib/sd-recommendations";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/components/plan/plan-provider";
import { formatCompact, formatPrice } from "@/lib/format";

const STATUS_TONES: Record<string, "warning" | "blue" | "positive" | "negative" | "neutral"> = {
  "Limit Order": "warning",
  Filled: "blue",
  Running: "positive",
  "Target 2 reached": "positive",
  "Invalidated (SL hit)": "negative",
  Missed: "neutral",
};

const STRENGTH_LABELS: Record<string, { label: string; tone: "positive" | "warning" | "neutral" }> = {
  fresh: { label: "Fresh", tone: "positive" },
  tested: { label: "Tested", tone: "warning" },
  broken: { label: "Broken", tone: "neutral" },
};

function statusTone(status?: string) {
  return STATUS_TONES[status ?? ""] ?? "neutral";
}

/** Mini price-ladder: SL — entry — T1 — T2 positioned proportionally. */
function PriceLadder({ hit, color }: { hit: SdScanHit; color: string }) {
  const { entry, target1, stopLoss } = hit;
  const isLong = hit.direction === "long";
  const risk = Math.abs(entry - stopLoss);
  const target2 = isLong ? entry + risk * 2 : entry - risk * 2;
  const lo = Math.min(stopLoss, entry, target1, target2);
  const hi = Math.max(stopLoss, entry, target1, target2);
  const span = Math.max(hi - lo, 1e-9);
  const pos = (v: number) => ((v - lo) / span) * 100;

  const pEntry = pos(entry);
  const pT2 = pos(target2);
  const pT1 = pos(target1);
  const pSL = pos(stopLoss);

  const markers = [
    { label: "T2", pct: pT2, value: target2, tone: "text-accent-2", strong: true },
    { label: "T1", pct: pT1, value: target1, tone: "text-accent-2", strong: false },
    { label: "Entry", pct: pEntry, value: entry, tone: "text-foreground", strong: true },
    { label: "SL", pct: pSL, value: stopLoss, tone: "text-negative", strong: false },
  ];

  // fill from entry toward the targets (the profitable run)
  const fillLeft = isLong ? pEntry : pT2;
  const fillRight = isLong ? pT2 : pEntry;

  return (
    <div className="flex min-w-[190px] items-center gap-2">
      <div className="relative h-6 flex-1">
        {/* track */}
        <div
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full opacity-25"
          style={{ background: color }}
        />
        {/* fill from entry toward targets */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            left: `${Math.min(fillLeft, fillRight)}%`,
            width: `${Math.max(0.5, Math.abs(fillRight - fillLeft))}%`,
          }}
        />
        {markers.map((m) => (
          <div
            key={m.label}
            className="group/ladder absolute top-1/2 -translate-y-1/2"
            style={{ left: `${m.pct}%` }}
            title={`${m.label} ${formatPrice(m.value)}`}
          >
            <div
              className={`size-1.5 -translate-x-1/2 rounded-full ${m.strong ? "ring-2 ring-black/40" : ""}`}
              style={{ background: m.tone === "text-negative" ? "var(--color-negative)" : color }}
            />
            <span
              className={`absolute -top-3.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold tabular-nums opacity-0 transition-opacity group-hover/ladder:opacity-100 ${m.tone}`}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <span className="w-14 shrink-0 text-right text-[10px] font-semibold tabular-nums" style={{ color }}>
        {formatPrice(entry)}
      </span>
    </div>
  );
}

/** Horizontal volume bar relative to the largest setup in the table. */
function VolumeBar({ volume, max }: { volume: number; max: number }) {
  const pct = Math.max(3, (volume / Math.max(max, 1)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-blue/60 to-accent-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-[10px] font-semibold tabular-nums text-muted">{formatCompact(volume)}</span>
    </div>
  );
}

function ZoneTable({ title, hits, tone }: { title: string; hits: SdScanHit[]; tone: "green" | "red" }) {
  const color = tone === "green" ? "var(--color-positive)" : "var(--color-negative)";
  const Icon = tone === "green" ? TrendingUp : TrendingDown;
  const maxVol = Math.max(1, ...hits.map((h) => h.volume24h));
  // Defensive: a Demand (Buy) table only ever shows long setups and a Supply
  // (Sell) table only ever shows short setups — never mix directions.
  const filtered = hits.filter((h) => (tone === "green" ? h.direction === "long" : h.direction === "short"));

  return (
    <section className="card relative flex flex-col overflow-hidden">
      {/* top accent glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-3/4 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: color }}
      />
      <div className="relative flex items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-lg shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}08)`,
              border: `1px solid ${color}44`,
              color,
            }}
          >
            <Icon className="size-4" />
          </span>
          <div>
            <h3 className="text-[14px] font-bold tracking-tight">{title}</h3>
            <p className="text-[10px] text-muted-2">
              {filtered.length} setup aktif · diurutkan dari volume tertinggi
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums"
          style={{ background: `${color}1a`, color, border: `1px solid ${color}44` }}
        >
          {filtered.length}
        </span>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-2/40 text-[9px] uppercase tracking-wider text-muted-2">
              <th className="px-4 py-2.5 font-semibold">Pair</th>
              <th className="px-4 py-2.5 font-semibold">Arah</th>
              <th className="px-4 py-2.5 font-semibold">Zona</th>
              <th className="px-4 py-2.5 font-semibold">Price Ladder</th>
              <th className="px-4 py-2.5 font-semibold">Volume 24H</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Confidence</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((hit) => {
              const strength = STRENGTH_LABELS[hit.strength] ?? { label: hit.strength, tone: "neutral" as const };
              return (
                <tr
                  key={hit.symbol}
                  className="group border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-2/60"
                >
                  <td className="px-4 py-3">
                    <Link href={`/analysis?symbol=${hit.symbol}`} className="flex items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold uppercase"
                        style={{ background: "var(--color-surface-3)", color, border: `1px solid ${color}33` }}
                      >
                        {hit.base.slice(0, 2)}
                      </span>
                      <span>
                        <span className="block text-[13px] font-bold leading-tight transition-colors group-hover:text-accent-2">
                          {hit.base}
                          <span className="font-medium text-muted-2">/USDT</span>
                        </span>
                        <span className="block text-[10px] tabular-nums text-muted-2">
                          {hit.change24h >= 0 ? "+" : ""}
                          {hit.change24h.toFixed(2)}%
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={hit.direction === "long" ? "positive" : "negative"}>
                      {hit.direction === "long" ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      {hit.direction === "long" ? "Buy" : "Sell"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={strength.tone}>{strength.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PriceLadder hit={hit} color={color} />
                  </td>
                  <td className="px-4 py-3">
                    <VolumeBar volume={hit.volume24h} max={maxVol} />
                  </td>
                  <td className="px-4 py-3">
                    {hit.status && <Badge tone={statusTone(hit.status)}>{hit.status}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[13px] font-bold tabular-nums" style={{ color }}>
                        {hit.confidence}%
                      </span>
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full" style={{ background: color, width: `${hit.confidence}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/analysis?symbol=${hit.symbol}`}
                      aria-label={`Buka ${hit.base}`}
                      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-2 transition-all hover:bg-surface-3 hover:text-foreground"
                    >
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[11px] text-muted-2">
                  Belum ada zona aktif.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PatternsView() {
  const { canAccess } = usePlan();
  const signalsEnabled = canAccess("signals");
  const { result, loading, error, lastRun, refresh } = useSdScan(signalsEnabled);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold">
            <Layers className="size-4.5 text-accent-2" />
            Signals
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Zona supply/demand aktif dari scan lintas watchlist (timeframe 15m).
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || !signalsEnabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-blue px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {loading ? "Scanning…" : "Scan Semua"}
        </button>
      </div>

      {!signalsEnabled ? (
        <div className="card relative overflow-hidden p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-2">
              <Sparkles className="size-3" />
              Pro feature
            </span>
            <h3 className="text-[16px] font-bold">Signals terkunci</h3>
            <p className="max-w-sm text-[12px] leading-snug text-muted">
              Upgrade ke Pro untuk melihat setup supply & demand live dari seluruh watchlist — arah entry, strength,
              dan confidence tiap zona.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-accent-blue px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Lock className="size-3.5" />
                Upgrade ke Pro
              </button>
            </div>
          </div>
        </div>
      ) : lastRun ? (
        <p className="text-[11px] text-muted-2">
          Terakhir discan: {new Date(lastRun).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      ) : null}

      {signalsEnabled && error && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-[12px] text-warning">
          {error}
        </div>
      )}

      {signalsEnabled && loading && !result && (
        <div className="flex h-64 items-center justify-center text-muted-2">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {signalsEnabled && result && (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <ZoneTable title="Demand Zones (Buy)" hits={result.demand} tone="green" />
          <ZoneTable title="Supply Zones (Sell)" hits={result.supply} tone="red" />
        </div>
      )}
    </div>
  );
}
