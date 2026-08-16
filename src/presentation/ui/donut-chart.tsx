interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}

export function DonutChart({ segments, size = 132, strokeWidth = 14, centerLabel, centerSub }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const offsets = segments.map((_, i) =>
    segments.slice(0, i).reduce((sum, s) => sum + (s.value / total) * circumference, 0),
  );

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          return (
            <circle
              key={`${seg.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offsets[i]}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-2xl font-bold leading-none">{centerLabel}</span>}
          {centerSub && <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-2">{centerSub}</span>}
        </div>
      )}
    </div>
  );
}
