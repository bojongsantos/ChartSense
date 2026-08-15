import type { SentimentData } from "@/lib/types";
import { Gauge } from "@/components/ui/gauge";

const zoneColors: Record<string, string> = {
  "Extreme Fear": "var(--color-negative)",
  Fear: "var(--color-warning)",
  Neutral: "var(--color-muted-2)",
  Greed: "#84cc16",
  "Extreme Greed": "var(--color-positive)",
};

export function MarketSentimentCard({ data }: { data: SentimentData }) {
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold">Market Sentiment</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-2">Fear & Greed</span>
      </div>

      <div className="mt-2 flex justify-center">
        <Gauge score={data.score} label={data.label} />
      </div>

      <div className="mt-3">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
          {data.distribution.map((zone) => (
            <div
              key={zone.label}
              style={{ width: `${zone.value}%`, backgroundColor: zoneColors[zone.label] }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1">
          {data.distribution.map((zone) => (
            <span key={zone.label} className="inline-flex items-center gap-1 text-[10px] text-muted-2">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: zoneColors[zone.label] }} />
              {zone.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
