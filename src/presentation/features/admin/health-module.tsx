"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/presentation/ui/badge";
import { Loader2 } from "lucide-react";

interface HealthResult {
  id: string;
  name: string;
  endpoint: string;
  status: "ok" | "down";
  latencyMs: number;
  detail: string;
}

export function HealthModule() {
  const [results, setResults] = useState<HealthResult[]>([]);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`Health API HTTP ${res.status}`);
      const payload = (await res.json()) as { results?: HealthResult[] };
      if (!Array.isArray(payload.results)) throw new Error("Invalid health response");
      setResults(payload.results);
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run();
  }, [run]);

  const ok = results.filter((result) => result.status === "ok").length;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">API Health</h2>
          <p className="mt-0.5 text-[12px] text-muted">Status seluruh layanan eksternal ChartSense.</p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={checking}
          className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted disabled:opacity-60"
        >
          {checking ? "Checking…" : "Cek Ulang"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-negative">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {results.map((result) => (
          <section key={result.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">{result.name}</h3>
              <Badge tone={result.status === "ok" ? "positive" : "negative"}>
                {result.status === "ok" ? "Online" : "Down"}
              </Badge>
            </div>
            <code className="truncate rounded-md bg-surface-3 px-2 py-1 text-[11px] text-muted-2">
              {result.endpoint}
            </code>
            <p className="text-[12px] text-muted">{result.detail}</p>
          </section>
        ))}
        {checking && results.length === 0 && (
          <div className="col-span-full flex h-28 items-center justify-center text-muted-2">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>

      <section className="card p-4">
        <h3 className="text-[13px] font-semibold">Ringkasan</h3>
        <p className="mt-2 text-[12px] text-muted">
          {results.length ? `${ok}/${results.length} layanan online.` : "Belum ada hasil pemeriksaan."}
        </p>
        <p className="mt-1 text-[12px] text-muted">
          Data live memakai polling REST. Scanner default mencakup 200 simbol.
        </p>
      </section>
    </div>
  );
}
