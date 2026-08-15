"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useScanner } from "@/lib/live";
import { DEFAULT_ADMIN_CONFIG, getEnabledWatchlist, loadAdminConfig } from "@/lib/admin";
import { PRO_FEATURES, featureLabel } from "@/lib/gating";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function Overview() {
  const router = useRouter();
  const { opportunities, loading, error } = useScanner();
  const [cfg, setCfg] = useState(DEFAULT_ADMIN_CONFIG);

  useEffect(() => {
    const sync = () => setCfg(loadAdminConfig());
    sync();
    window.addEventListener("chartsense:admin-change", sync);
    return () => window.removeEventListener("chartsense:admin-change", sync);
  }, []);

  const enabledCount = getEnabledWatchlist(cfg).length;
  const overrides = Object.keys(cfg.gateOverrides).length;
  const topSetup = opportunities[0];

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Overview</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Ringkasan konfigurasi dan status sistem ChartSense.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => router.push("/admin/watchlist")}
          className="card flex flex-col gap-1 p-4 text-left transition-colors hover:border-border-strong"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">Watchlist</span>
          <span className="text-2xl font-bold">{enabledCount}</span>
          <span className="text-[11px] text-muted">symbol aktif dari {cfg.watchlist.length}</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/scanner")}
          className="card flex flex-col gap-1 p-4 text-left transition-colors hover:border-border-strong"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">Scanner</span>
          <span className="text-2xl font-bold">{opportunities.length}</span>
          <span className="text-[11px] text-muted">{loading ? "scanning…" : "setup terdeteksi"}</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/gating")}
          className="card flex flex-col gap-1 p-4 text-left transition-colors hover:border-border-strong"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">Plan</span>
          <span className="text-2xl font-bold uppercase">{cfg.plan}</span>
          <span className="text-[11px] text-muted">{overrides} feature override</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/health")}
          className="card flex flex-col gap-1 p-4 text-left transition-colors hover:border-border-strong"
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-2">API Health</span>
          <span className="text-2xl font-bold">{error ? "0/2" : "2/2"}</span>
          <span className="text-[11px] text-muted">Binance · Fear & Greed</span>
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Feature Gating</h3>
            <button
              type="button"
              onClick={() => router.push("/admin/gating")}
              className="text-[11px] font-semibold text-accent-2 hover:underline"
            >
              Kelola →
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {PRO_FEATURES.map((f) => {
              const override = cfg.gateOverrides[f];
              const status = override === true ? "forced ON" : override === false ? "forced OFF" : "default";
              return (
                <li key={f} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="truncate text-[12px] font-medium text-foreground">{featureLabel[f]}</span>
                  <Badge tone={override === true ? "positive" : override === false ? "negative" : "neutral"} className="shrink-0">
                    {status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Top Setup Terkini</h3>
            <button
              type="button"
              onClick={() => router.push("/admin/scanner")}
              className="text-[11px] font-semibold text-accent-2 hover:underline"
            >
              Lihat semua →
            </button>
          </div>
          {topSetup ? (
            <div className="mt-3 rounded-lg border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold">{topSetup.pair.symbol}</span>
                <span className="text-sm font-bold tabular-nums text-accent-2">{topSetup.confidence}%</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">{topSetup.pattern} · {topSetup.setup} setup</p>
              <p className="mt-1 text-[11px] text-muted-2">
                ${topSetup.pair.price.toLocaleString()} · {topSetup.pair.change24h.toFixed(2)}% 24h
              </p>
            </div>
          ) : (
            <div className="mt-3 flex h-24 items-center justify-center text-muted-2">
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Belum ada data scan."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
