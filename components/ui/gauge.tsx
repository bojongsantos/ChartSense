function scoreColor(score: number): string {
  if (score >= 75) return "var(--color-positive)";
  if (score >= 55) return "#84cc16";
  if (score >= 35) return "var(--color-warning)";
  return "var(--color-negative)";
}

interface GaugeProps {
  score: number;
  label?: string;
  width?: number;
}

const CX = 100;
const CY = 104;
const R = 82;

function pointAt(score: number, radius: number): { x: number; y: number } {
  const angle = Math.PI - (score / 100) * Math.PI;
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function arcPath(fromScore: number, toScore: number, radius: number): string {
  const start = pointAt(fromScore, radius);
  const end = pointAt(toScore, radius);
  const largeArc = toScore - fromScore > 50 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function Gauge({ score, label, width = 210 }: GaugeProps) {
  const height = width * 0.58 + 46;
  const scale = width / 200;
  const color = scoreColor(score);
  const needleTip = pointAt(score, R - 34);
  const needleBase = pointAt(score, 5);

  return (
    <div className="relative inline-flex flex-col items-center justify-center" style={{ width, height }}>
      <svg viewBox="0 0 200 116" width={width} height={width * 0.58}>
        <g transform={`scale(${scale})`}>
          <path d={arcPath(0, 100, R)} fill="none" stroke="var(--color-surface-3)" strokeWidth={11} strokeLinecap="round" />
          <path
            d={arcPath(0, score, R)}
            fill="none"
            stroke={color}
            strokeWidth={11}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 400ms ease" }}
          />
          {[0, 25, 50, 75, 100].map((t) => {
            const inner = pointAt(t, R - 7);
            const outer = pointAt(t, R + 7);
            return (
              <line
                key={t}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--color-border-strong)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
          <line
            x1={needleBase.x}
            y1={needleBase.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="var(--color-foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={5} fill="var(--color-foreground)" />
          <circle cx={CX} cy={CY} r={2.5} fill="var(--color-background)" />
        </g>
      </svg>
      <div className="z-10 flex flex-col items-center leading-none">
        <span className="mt-2 text-2xl font-bold">{score}</span>
        <span className="mt-1 text-[11px] font-medium uppercase text-muted">{label ?? "Neutral"}</span>
      </div>
    </div>
  );
}
