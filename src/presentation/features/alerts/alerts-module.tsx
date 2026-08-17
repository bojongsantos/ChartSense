"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Loader2, Pause, Play, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { AlertCondition } from "@/core/domain/alerts/alert-rules";
import { isValidBinanceSymbol, normalizeUsdtSymbol } from "@/core/domain/market/symbol";
import {
  createAlert,
  deleteAlert,
  fetchAlerts,
  setAlertStatus,
  type PriceAlertDto,
} from "@/infrastructure/persistence/alerts-api-client";
import { usePlan } from "@/presentation/features/access/plan-provider";
import { formatPrice } from "@/shared/lib/format";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_STYLE: Record<PriceAlertDto["status"], string> = {
  ACTIVE: "border-positive/30 bg-positive/10 text-positive",
  TRIGGERED: "border-accent/30 bg-accent/10 text-accent-2",
  PAUSED: "border-border bg-surface-3 text-muted-2",
};

const STATUS_LABEL: Record<PriceAlertDto["status"], string> = {
  ACTIVE: "Aktif",
  TRIGGERED: "Tercapai",
  PAUSED: "Jeda",
};

export function AlertsModule() {
  const { authenticated } = usePlan();
  const [alerts, setAlerts] = useState<PriceAlertDto[]>([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("PRICE_ABOVE");
  const [threshold, setThreshold] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAlerts();
      setAlerts(data.alerts);
      setLimit(data.limit);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const armed = alerts.filter((alert) => alert.status !== "TRIGGERED").length;
  const atLimit = armed >= limit;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeUsdtSymbol(symbol);
    const price = Number.parseFloat(threshold);
    if (!isValidBinanceSymbol(normalized)) {
      setError("Simbol tidak dikenali. Contoh: BTC atau BTCUSDT.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Harga target harus angka lebih besar dari nol.");
      return;
    }
    setSaving(true);
    try {
      const created = await createAlert({
        symbol: normalized,
        condition,
        threshold: price,
        note: note.trim() || undefined,
      });
      setAlerts((previous) => [created, ...previous]);
      setSymbol("");
      setThreshold("");
      setNote("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(alert: PriceAlertDto) {
    const next = alert.status === "PAUSED" || alert.status === "TRIGGERED" ? "ACTIVE" : "PAUSED";
    try {
      await setAlertStatus(alert.id, next);
      setAlerts((previous) =>
        previous.map((item) =>
          item.id === alert.id
            ? { ...item, status: next, triggeredAt: null, triggeredPrice: null }
            : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function remove(id: string) {
    try {
      await deleteAlert(id);
      setAlerts((previous) => previous.filter((item) => item.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  if (!authenticated) {
    return (
      <div className="p-6">
        <div className="card mx-auto mt-10 max-w-md p-8 text-center">
          <BellRing className="mx-auto size-8 text-accent-2" />
          <h1 className="mt-4 text-lg font-bold">Alert harga</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Masuk untuk memasang alert pada level harga tertentu. Kami memeriksa pasar secara
            berkala dan memberi tahu Anda saat level tercapai.
          </p>
          <Link
            href="/login?next=/alerts"
            className="mt-5 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Masuk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Alerts</h1>
          <p className="mt-1 text-xs text-muted">
            Pemberitahuan saat harga menyentuh level yang Anda tentukan.
          </p>
        </div>
        <span className="rounded-lg border border-border bg-surface-3 px-3 py-1.5 text-[11px] font-semibold text-muted">
          {armed}/{limit} alert aktif
        </span>
      </header>

      <form onSubmit={submit} className="card mt-5 grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr_1fr_auto]">
        <div>
          <label htmlFor="alert-symbol" className="text-[11px] font-semibold text-muted">
            Simbol
          </label>
          <input
            id="alert-symbol"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="BTC"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="alert-condition" className="text-[11px] font-semibold text-muted">
            Kondisi
          </label>
          <select
            id="alert-condition"
            value={condition}
            onChange={(event) => setCondition(event.target.value as AlertCondition)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent/50 focus:outline-none"
          >
            <option value="PRICE_ABOVE">Naik ke</option>
            <option value="PRICE_BELOW">Turun ke</option>
          </select>
        </div>
        <div>
          <label htmlFor="alert-threshold" className="text-[11px] font-semibold text-muted">
            Harga target (USDT)
          </label>
          <input
            id="alert-threshold"
            inputMode="decimal"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="65000"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="alert-note" className="text-[11px] font-semibold text-muted">
            Catatan (opsional)
          </label>
          <input
            id="alert-note"
            value={note}
            maxLength={140}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Retest demand zone"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent/50 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving || atLimit}
          title={atLimit ? `Batas ${limit} alert aktif tercapai` : undefined}
          className="mt-auto inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Tambah
        </button>
      </form>

      {atLimit && (
        <p className="mt-2 text-[11px] text-muted-2">
          Batas paket tercapai. Hapus atau jeda alert lain, atau{" "}
          <Link href="/account" className="font-semibold text-accent-2">
            naikkan ke Premium
          </Link>
          .
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-[12px] text-negative">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-2">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="card mt-5 px-6 py-12 text-center">
          <BellRing className="mx-auto size-7 text-muted-2" />
          <p className="mt-3 text-sm font-semibold">Belum ada alert</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-2">
            Tambahkan level harga di atas. Saat pasar menyentuhnya, notifikasi muncul di ikon
            lonceng dan alert berpindah ke status Tercapai.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {alerts.map((alert) => {
            const rising = alert.condition === "PRICE_ABOVE";
            const Icon = rising ? TrendingUp : TrendingDown;
            return (
              <li
                key={alert.id}
                className="card flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <Icon className={`size-4 shrink-0 ${rising ? "text-positive" : "text-negative"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {alert.symbol}{" "}
                    <span className="font-medium text-muted">
                      {rising ? "naik ke" : "turun ke"}
                    </span>{" "}
                    <span className="tabular-nums">${formatPrice(alert.threshold)}</span>
                  </p>
                  {alert.note && <p className="mt-0.5 truncate text-[11px] text-muted-2">{alert.note}</p>}
                  {alert.triggeredAt && alert.triggeredPrice !== null && (
                    <p className="mt-0.5 text-[11px] text-accent-2">
                      Tercapai {dateFormatter.format(new Date(alert.triggeredAt))} pada $
                      {formatPrice(alert.triggeredPrice)}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[alert.status]}`}
                >
                  {STATUS_LABEL[alert.status]}
                </span>
                <button
                  type="button"
                  onClick={() => void toggle(alert)}
                  aria-label={alert.status === "ACTIVE" ? "Jeda alert" : "Aktifkan alert"}
                  className="rounded-lg border border-border p-2 text-muted-2 transition-colors hover:text-foreground"
                >
                  {alert.status === "ACTIVE" ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(alert.id)}
                  aria-label="Hapus alert"
                  className="rounded-lg border border-border p-2 text-muted-2 transition-colors hover:border-negative/40 hover:text-negative"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
