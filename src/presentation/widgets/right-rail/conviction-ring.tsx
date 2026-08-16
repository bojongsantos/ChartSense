"use client";

import { useEffect, useState } from "react";

const SIZE = 150;
const R = 66;
const STROKE = 9;
const C = 2 * Math.PI * R;

export const gradeColor: Record<string, string> = {
  A: "#34d399",
  B: "#60a5fa",
  C: "#a78bfa",
  D: "#fbbf24",
  F: "#f87171",
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface ConvictionRingProps {
  score: number;
  grade: string;
}

export function ConvictionRing({ score, grade }: ConvictionRingProps) {
  const color = gradeColor[grade] ?? gradeColor.F;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setAnimated(score * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const progress = Math.max(0, Math.min(1, animated / 100));
  const dashOffset = C * (1 - progress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        {/* Background track — muted reference line only */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
        />
        {/* Foreground progress — solid, flat, rounded caps */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ opacity: progress > 0.001 ? 1 : 0, transition: "opacity 200ms" }}
        />
      </svg>

      {/* Center text — no container, transparent */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-[38px] font-semibold leading-none text-white">{Math.round(animated)}</span>
        <span className="ml-1.5 text-[17px] font-medium text-white/50">/100</span>
      </div>
    </div>
  );
}
