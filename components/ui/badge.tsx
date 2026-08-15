import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "positive" | "negative" | "warning" | "blue";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-surface-3 text-muted",
  accent: "border-accent/40 bg-accent/10 text-accent-2",
  positive: "border-positive/30 bg-positive/10 text-positive",
  negative: "border-negative/30 bg-negative/10 text-negative",
  warning: "border-warning/30 bg-warning/10 text-warning",
  blue: "border-accent-blue/30 bg-accent-blue/10 text-accent-blue",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none ${tones[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
