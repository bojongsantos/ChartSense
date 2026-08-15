"use client";

import type { AnalysisResult, Timeframe } from "@/lib/types";
import { priceDecimals } from "@/lib/format";
import { AnalysisHeader } from "@/components/analysis/analysis-header";
import { ChartPanel } from "@/components/analysis/chart-panel";
import { PatternCard } from "@/components/analysis/pattern-card";
import { ReasoningCard } from "@/components/analysis/reasoning-card";
import { PerformanceCard } from "@/components/analysis/performance-card";
import { SimilarPatternsCard } from "@/components/analysis/similar-patterns-card";

interface AnalysisViewProps {
  data: AnalysisResult;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export function AnalysisView({ data, timeframe, onTimeframeChange }: AnalysisViewProps) {
  const precision = priceDecimals(data.pair.price);

  return (
    <div className="flex flex-col gap-5 p-6">
      <AnalysisHeader
        pair={data.pair}
        timeframe={timeframe}
        exchange={data.exchange}
        analyzedAt={data.analyzedAt}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ChartPanel
          data={data.chartData}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          symbol={data.pair.symbol}
          precision={precision}
          price={data.pair.price}
          change24h={data.pair.change24h}
          pattern={data.pattern}
          levels={data.levels}
        />
        <PatternCard
          pattern={data.pattern}
          levels={data.levels}
          riskReward={data.riskReward}
          price={data.pair.price}
          precision={precision}
        />
      </div>

      <div className="flex flex-col gap-6">
        <ReasoningCard sections={data.reasoning} />

        <div className="grid gap-6 lg:grid-cols-2">
          <PerformanceCard data={data.performance} />
          <SimilarPatternsCard data={data.similarPatterns} />
        </div>
      </div>
    </div>
  );
}
