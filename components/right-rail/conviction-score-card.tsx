"use client";

import { Info } from "lucide-react";
import type { ConvictionScore } from "@/lib/conviction";
import { LockedOverlay } from "@/components/ui/locked-overlay";
import { Tooltip } from "@/components/ui/tooltip";
import { ConvictionRing } from "@/components/right-rail/conviction-ring";

const tooltipContent: Record<string, string> = {
  quality: "Rasio kerapatan zona terhadap volatilitas pasar. Semakin sempit, semakin akurat sebagai level entry.",
  freshness: "Status integritas zona. Fresh: belum diuji. Tested: sudah retested. Broken: harga telah menembus.",
  touches: "Pengurangan skor akibat retest zona. Setiap sentuhan mengurangi 5 poin.",
  base: "Skor dasar yang diberikan pada setiap zona yang berhasil terdeteksi dan tervalidasi.",
};

/** Status dot color from normalized quality (0..1). */
function dotColor(ratio: number): string {
  if (ratio >= 0.7) return "var(--color-positive)";
  if (ratio >= 0.3) return "var(--color-warning)";
  return "var(--color-negative)";
}

export function ConvictionScoreCard({ data }: { data: ConvictionScore }) {
  const waiting = data.score === 0 && data.grade === "F";

  return (
    <section className="card p-4">
      <h3 className="text-center text-[13px] font-semibold">Conviction Score</h3>

      <div className="mt-4 flex flex-col items-center">
        {waiting ? (
          <span className="py-10 text-lg font-semibold text-muted-2">Waiting for live data</span>
        ) : (
          <ConvictionRing score={data.score} grade={data.grade} />
        )}
      </div>

      {!waiting && (
        <p className="mt-5 text-center text-[12px] leading-snug text-muted">{data.interpretation}</p>
      )}

      <LockedOverlay feature="convictionDetail" className="mt-3">
        <ul className="space-y-2.5">
          {data.components.map((comp) => (
            <li key={comp.id} className="flex items-center gap-2.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: dotColor(comp.ratio) }}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                {comp.label}
              </span>
              <Tooltip content={tooltipContent[comp.id] ?? comp.detail}>
                <Info className="size-3.5 text-muted-2 transition-colors hover:text-muted" />
              </Tooltip>
            </li>
          ))}
        </ul>
      </LockedOverlay>
    </section>
  );
}
