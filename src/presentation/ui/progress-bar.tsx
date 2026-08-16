interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressBar({ value, max = 100, className, trackClassName, barClassName }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-3 ${trackClassName ?? ""} ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r from-accent to-accent-blue ${barClassName ?? ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
