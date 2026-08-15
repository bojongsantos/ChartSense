"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ScannerView } from "@/components/scanner/scanner-view";
import { useScanner } from "@/lib/live";

export function ScannerClient() {
  const { opportunities, loading, error, refresh } = useScanner();

  return (
    <AppShell opportunities={opportunities}>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">AI Scanner</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            Real-time setups ranked by pattern confidence across 12 major pairs.
          </p>
        </div>
        {error && (
          <div className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
            {error}
          </div>
        )}
        <ScannerView data={opportunities} loading={loading} onRun={refresh} />
      </div>
    </AppShell>
  );
}
