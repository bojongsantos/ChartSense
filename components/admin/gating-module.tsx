"use client";

import { useEffect, useState } from "react";
import { DEFAULT_ADMIN_CONFIG, loadAdminConfig, saveAdminConfig } from "@/lib/admin";
import { PRO_FEATURES, featureLabel } from "@/lib/gating";
import { Badge } from "@/components/ui/badge";

const PLAN_OPTIONS = [
  { value: "free", label: "Free", desc: "Semua fitur pro terkunci sesuai default" },
  { value: "pro", label: "Pro", desc: "Semua fitur pro terbuka sesuai default" },
] as const;

const OVERRIDE_OPTIONS = [
  { value: undefined, label: "Default" },
  { value: true, label: "Force ON" },
  { value: false, label: "Force OFF" },
] as const;

export function GatingModule() {
  // Init with the constant default so SSR and client first render match;
  // real saved config is applied after hydration in the effect below.
  const [config, setConfig] = useState(DEFAULT_ADMIN_CONFIG);

  // Re-sync from localStorage after hydration to avoid SSR mismatch.
  useEffect(() => {
    const sync = () => setConfig(loadAdminConfig());
    sync();
    window.addEventListener("chartsense:admin-change", sync);
    return () => window.removeEventListener("chartsense:admin-change", sync);
  }, []);

  const commit = (next: typeof config) => {
    setConfig(next);
    saveAdminConfig(next);
  };

  const setPlan = (plan: "free" | "pro") => commit({ ...config, plan });
  const setOverride = (feature: string, value: boolean | undefined) => {
    const gateOverrides = { ...config.gateOverrides };
    if (value === undefined) {
      delete gateOverrides[feature as keyof typeof gateOverrides];
    } else {
      gateOverrides[feature as keyof typeof gateOverrides] = value;
    }
    commit({ ...config, gateOverrides });
  };
  const clearOverrides = () => commit({ ...config, gateOverrides: {} });

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Plan &amp; Feature Gating</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Atur plan default dan paksa status fitur pro. Perubahan langsung berlaku di aplikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={clearOverrides}
          className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
        >
          Bersihkan semua override
        </button>
      </div>

      <section className="card p-4">
        <h3 className="text-[13px] font-semibold">Plan Default</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PLAN_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlan(p.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                config.plan === p.value
                  ? "border-accent/60 bg-accent/10"
                  : "border-border bg-surface-2 hover:border-border-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold uppercase">{p.label}</span>
                {config.plan === p.value && <Badge tone="accent">Aktif</Badge>}
              </div>
              <p className="mt-1 text-[11px] text-muted">{p.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-[13px] font-semibold">Override Fitur Pro</h3>
        <p className="mt-0.5 text-[11px] text-muted">
          Default = mengikuti plan. Force ON/OFF mengesampingkan plan untuk fitur tersebut.
        </p>
        <ul className="mt-3 space-y-2">
          {PRO_FEATURES.map((f) => {
            const current = config.gateOverrides[f];
            return (
              <li key={f} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                  {featureLabel[f]}
                  <span className="ml-1.5 font-mono text-[10px] text-muted-2">{f}</span>
                </span>
                <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5">
                  {OVERRIDE_OPTIONS.map((o) => (
                    <button
                      key={String(o.value)}
                      type="button"
                      onClick={() => setOverride(f, o.value)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        current === o.value
                          ? "bg-accent/15 text-accent-2"
                          : "text-muted-2 hover:text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
