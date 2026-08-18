"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkCheck, BookmarkPlus, Loader2 } from "lucide-react";
import type { PatternSummary } from "@/core/domain/models";
import { saveSetupToWatchlist } from "@/infrastructure/persistence/watchlist-api-client";
import { usePlan } from "@/presentation/features/access/plan-provider";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Pins the setup currently on screen to the user's watchlist. Rendered only
 * when a real setup exists — there is nothing meaningful to save otherwise.
 */
export function SaveSetupButton({ pattern }: { pattern: PatternSummary }) {
  const { authenticated } = usePlan();
  const setup = pattern.shape?.setup;
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // A different setup is a different thing to save, so the button resets.
  const setupKey = `${pattern.symbol}|${pattern.timeframe}|${setup?.entry ?? ""}|${setup?.stopLoss ?? ""}`;
  const [trackedKey, setTrackedKey] = useState(setupKey);
  if (setupKey !== trackedKey) {
    setTrackedKey(setupKey);
    setState("idle");
    setMessage(null);
  }

  if (!setup) return null;

  if (!authenticated) {
    return (
      <Link
        href="/login?next=/watchlist"
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-muted transition-colors hover:border-border-strong hover:text-foreground"
      >
        <BookmarkPlus className="size-3.5" />
        Masuk untuk menyimpan setup
      </Link>
    );
  }

  async function save() {
    if (!setup) return;
    setState("saving");
    try {
      await saveSetupToWatchlist({
        symbol: pattern.symbol,
        timeframe: pattern.timeframe,
        direction: setup.direction,
        entry: setup.entry,
        target1: setup.target1,
        target2: setup.target2,
        stopLoss: setup.stopLoss,
        riskReward: setup.riskReward,
        confidence: Math.round(setup.confidence),
      });
      setState("saved");
      setMessage(null);
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void save()}
        disabled={state === "saving" || state === "saved"}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold transition-colors hover:border-border-strong disabled:opacity-60"
      >
        {state === "saving" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : state === "saved" ? (
          <BookmarkCheck className="size-3.5 text-positive" />
        ) : (
          <BookmarkPlus className="size-3.5" />
        )}
        {state === "saved" ? "Tersimpan di Watchlist" : "Simpan setup ke Watchlist"}
      </button>
      {state === "saved" && (
        <Link
          href="/watchlist"
          className="mt-1.5 block text-center text-[10px] font-semibold text-accent-2"
        >
          Lihat watchlist
        </Link>
      )}
      {state === "error" && message && (
        <p className="mt-1.5 text-center text-[10px] text-negative">{message}</p>
      )}
    </div>
  );
}
