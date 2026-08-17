"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, Trash2, XCircle } from "lucide-react";
import type { SetupOutcome } from "@/core/domain/journal/setup-outcome";
import {
  cancelJournalEntry,
  deleteJournalEntry,
  fetchJournal,
  type JournalEntryDto,
  type JournalListDto,
} from "@/infrastructure/persistence/journal-api-client";
import { usePlan } from "@/presentation/features/access/plan-provider";
import { formatPrice, priceDecimals } from "@/shared/lib/format";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const OUTCOME_STYLE: Record<SetupOutcome, string> = {
  OPEN: "border-border bg-surface-3 text-muted",
  TARGET_HIT: "border-positive/30 bg-positive/10 text-positive",
  STOPPED_OUT: "border-negative/30 bg-negative/10 text-negative",
  CANCELED: "border-border bg-surface-3 text-muted-2",
};

const OUTCOME_LABEL: Record<SetupOutcome, string> = {
  OPEN: "Berjalan",
  TARGET_HIT: "Target tercapai",
  STOPPED_OUT: "Kena stop",
  CANCELED: "Dibatalkan",
};

const EMPTY_STATS: JournalListDto["stats"] = {
  total: 0,
  open: 0,
  wins: 0,
  losses: 0,
  winRate: null,
};

export function HistoryModule() {
  const { authenticated } = usePlan();
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [stats, setStats] = useState<JournalListDto["stats"]>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchJournal();
      setEntries(data.entries);
      setStats(data.stats);
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

  async function cancel(id: string) {
    try {
      await cancelJournalEntry(id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function remove(id: string) {
    try {
      await deleteJournalEntry(id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  if (!authenticated) {
    return (
      <div className="p-6">
        <div className="card mx-auto mt-10 max-w-md p-8 text-center">
          <History className="mx-auto size-8 text-accent-2" />
          <h1 className="mt-4 text-lg font-bold">Riwayat setup</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Masuk untuk menyimpan setup yang Anda amati dan melihat hasilnya setelah pasar
            bergerak.
          </p>
          <Link
            href="/login?next=/history"
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
      <header>
        <h1 className="text-lg font-bold">History</h1>
        <p className="mt-1 text-xs text-muted">
          Setup yang Anda simpan, beserta hasilnya setelah dievaluasi terhadap pergerakan harga.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total setup", value: String(stats.total) },
          { label: "Berjalan", value: String(stats.open) },
          { label: "Target tercapai", value: String(stats.wins) },
          {
            label: "Win rate",
            value: stats.winRate === null ? "—" : `${stats.winRate}%`,
          },
        ].map((tile) => (
          <div key={tile.label} className="card px-4 py-3">
            <p className="text-[11px] font-medium text-muted-2">{tile.label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {stats.winRate === null && stats.total > 0 && (
        <p className="mt-2 text-[11px] text-muted-2">
          Win rate muncul setelah ada setup yang selesai — belum ada yang mencapai target atau stop.
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
      ) : entries.length === 0 ? (
        <div className="card mt-5 px-6 py-12 text-center">
          <History className="mx-auto size-7 text-muted-2" />
          <p className="mt-3 text-sm font-semibold">Belum ada setup tersimpan</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-2">
            Buka sebuah coin di dashboard, lalu simpan setup-nya. Setiap setup akan dievaluasi
            terhadap rentang harga harian sejak disimpan, dan hasilnya muncul di sini.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg border border-border px-3.5 py-2 text-xs font-bold hover:border-border-strong"
          >
            Buka dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-surface-3 text-muted">
              <tr>
                <th className="p-3 font-semibold">Setup</th>
                <th className="p-3 font-semibold">Entry</th>
                <th className="p-3 font-semibold">Target 1</th>
                <th className="p-3 font-semibold">Stop</th>
                <th className="p-3 font-semibold">R:R</th>
                <th className="p-3 font-semibold">Disimpan</th>
                <th className="p-3 font-semibold">Hasil</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((item) => {
                const decimals = priceDecimals(item.entry);
                const long = item.direction === "long";
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-bold">{item.symbol}</p>
                      <p className="text-muted-2">
                        <span className={long ? "text-positive" : "text-negative"}>
                          {long ? "Long" : "Short"}
                        </span>{" "}
                        · {item.timeframe} · {item.confidence}/100
                      </p>
                    </td>
                    <td className="p-3 tabular-nums">${formatPrice(item.entry, decimals)}</td>
                    <td className="p-3 tabular-nums">${formatPrice(item.target1, decimals)}</td>
                    <td className="p-3 tabular-nums">${formatPrice(item.stopLoss, decimals)}</td>
                    <td className="p-3 tabular-nums">{item.riskReward.toFixed(2)}</td>
                    <td className="p-3 text-muted-2">
                      {dateFormatter.format(new Date(item.createdAt))}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${OUTCOME_STYLE[item.outcome]}`}
                      >
                        {OUTCOME_LABEL[item.outcome]}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        {item.outcome === "OPEN" && (
                          <button
                            type="button"
                            onClick={() => void cancel(item.id)}
                            aria-label="Batalkan setup"
                            title="Tandai dibatalkan"
                            className="rounded-lg border border-border p-1.5 text-muted-2 transition-colors hover:text-foreground"
                          >
                            <XCircle className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(item.id)}
                          aria-label="Hapus entri"
                          className="rounded-lg border border-border p-1.5 text-muted-2 transition-colors hover:border-negative/40 hover:text-negative"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
