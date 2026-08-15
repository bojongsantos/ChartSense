"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface HealthResult {
  id: string;
  name: string;
  endpoint: string;
  status: "ok" | "down" | "checking";
  latencyMs?: number;
  detail: string;
}

function checkBinance(): Promise<HealthResult> {
  const start = performance.now();
  return fetch("https://data-api.binance.vision/api/v3/ping", { cache: "no-store" })
    .then((res) => {
      const latencyMs = Math.round(performance.now() - start);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return {
        id: "binance",
        name: "Binance (Data API)",
        endpoint: "data-api.binance.vision/api/v3/ping",
        status: "ok" as const,
        latencyMs,
        detail: `Ping OK · ${latencyMs}ms`,
      };
    })
    .catch((e) => ({
      id: "binance",
      name: "Binance (Data API)",
      endpoint: "data-api.binance.vision/api/v3/ping",
      status: "down" as const,
      detail: e instanceof Error ? e.message : String(e),
    }));
}

function checkFearGreed(): Promise<HealthResult> {
  const start = performance.now();
  return fetch("https://api.alternative.me/fng/", { cache: "no-store" })
    .then(async (res) => {
      const latencyMs = Math.round(performance.now() - start);
      const j = await res.json();
      const value = j.data?.[0]?.value;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return {
        id: "fng",
        name: "Fear & Greed (Alternative.me)",
        endpoint: "api.alternative.me/fng/",
        status: "ok" as const,
        latencyMs,
        detail: `Index ${value}/100 · ${latencyMs}ms`,
      };
    })
    .catch((e) => ({
      id: "fng",
      name: "Fear & Greed (Alternative.me)",
      endpoint: "api.alternative.me/fng/",
      status: "down" as const,
      detail: e instanceof Error ? e.message : String(e),
    }));
}

export function HealthModule() {
  const [results, setResults] = useState<HealthResult[]>([]);
  const [checking, setChecking] = useState(true);

  const run = async () => {
    setChecking(true);
    setResults([
      { id: "binance", name: "Binance (Data API)", endpoint: "data-api.binance.vision", status: "checking", detail: "…" },
      { id: "fng", name: "Fear & Greed (Alternative.me)", endpoint: "api.alternative.me", status: "checking", detail: "…" },
    ]);
    const [b, f] = await Promise.all([checkBinance(), checkFearGreed()]);
    setResults([b, f]);
    setChecking(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, []);

  const ok = results.filter((r) => r.status === "ok").length;
  const up = results.length > 0 && results.every((r) => r.status !== "checking");

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">API Health</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Status konektivitas ke layanan eksternal yang dipakai aplikasi.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={checking}
          className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
        >
          {checking ? "Checking…" : "Cek Ulang"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {results.map((r) => (
          <section key={r.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    r.status === "ok" ? "bg-positive" : r.status === "down" ? "bg-negative" : "bg-muted-2"
                  }`}
                />
                <h3 className="text-[13px] font-semibold">{r.name}</h3>
              </div>
              {r.status === "checking" ? (
                <Loader2 className="size-4 animate-spin text-muted-2" />
              ) : (
                <Badge tone={r.status === "ok" ? "positive" : "negative"}>
                  {r.status === "ok" ? "Online" : "Down"}
                </Badge>
              )}
            </div>
            <code className="truncate rounded-md bg-surface-3 px-2 py-1 text-[11px] text-muted-2">{r.endpoint}</code>
            <p className="text-[12px] text-muted">{r.detail}</p>
          </section>
        ))}
      </div>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">Ringkasan</h3>
          {up && (
            <span className="text-[11px] text-muted-2">
              {ok}/{results.length} layanan online
            </span>
          )}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          WebSocket Binance diblokir dari sebagian jaringan — aplikasi memakai polling REST
          (data-api.binance.vision) tiap 4 detik untuk data real-time. Scanner memakai 12 symbol
          default yang dapat dikelola di halaman Watchlist.
        </p>
      </section>
    </div>
  );
}
