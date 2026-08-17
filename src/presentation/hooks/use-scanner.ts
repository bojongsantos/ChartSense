"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResult } from "@/core/application/scanner/scanner-service";
import type {
  SdScanResult,
  TopSetup,
} from "@/core/application/scanner/supply-demand-scan-service";
import type { ScannerOpportunity } from "@/core/domain/models";
import { fetchEnabledWatchlist } from "@/infrastructure/persistence/watchlist-api-client";

interface SignalsApiPayload {
  result: SdScanResult;
  top: TopSetup[];
}

async function postScan<T>(path: string, body: Record<string, unknown>, useWatchlist = true): Promise<T> {
  const symbols = useWatchlist ? await fetchEnabledWatchlist() : undefined;
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, ...(symbols ? { symbols } : {}) }),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (${response.status})`);
  return payload;
}

export function useScanner(): {
  opportunities: ScannerOpportunity[];
  total: number;
  loading: boolean;
  error: string | null;
  lastRun: string | null;
  refresh: () => void;
} {
  const [opportunities, setOpportunities] = useState<ScannerOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const execute = useCallback(async (force: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const result = await postScan<ScanResult>("/api/scanner", { force });
      setOpportunities(result.opportunities);
      setTotal(result.total);
      setError(result.errors.length ? result.errors.join("; ") : null);
      setLastRun(result.scannedAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => void execute(true), [execute]);
  useEffect(() => {
    const timer = window.setTimeout(() => void execute(false), 0);
    return () => window.clearTimeout(timer);
  }, [execute]);

  return { opportunities, total, loading, error, lastRun, refresh };
}

export function useSdScan(enabled = true): {
  result: SdScanResult | null;
  loading: boolean;
  error: string | null;
  lastRun: string | null;
  refresh: () => void;
} {
  const [result, setResult] = useState<SdScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const execute = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const payload = await postScan<SignalsApiPayload>("/api/signals", { force }, false);
      setResult(payload.result);
      setError(
        payload.result.errors.length
          ? `${payload.result.errors.length} simbol gagal dipindai.`
          : null,
      );
      setLastRun(payload.result.scannedAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => void execute(true), [execute]);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void execute(false), 0);
    return () => window.clearTimeout(timer);
  }, [execute, enabled]);

  return { result, loading, error, lastRun, refresh };
}

export function useTopSetups(limit = 5): {
  top: TopSetup[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [top, setTop] = useState<TopSetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const payload = await postScan<SignalsApiPayload>("/api/signals", { force, limit }, false);
      setTop(payload.top);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refresh = useCallback(() => void execute(true), [execute]);
  useEffect(() => {
    const timer = window.setTimeout(() => void execute(false), 0);
    return () => window.clearTimeout(timer);
  }, [execute]);

  return { top, loading, error, refresh };
}
