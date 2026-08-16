"use client";

import type { AnalysisResult, Timeframe } from "@/core/domain/models";
import { priceDecimals } from "@/shared/lib/format";
import { AnalysisHeader } from "@/presentation/features/analysis/analysis-header";
import { ChartPanel } from "@/presentation/features/analysis/chart-panel";
import { PatternCard } from "@/presentation/features/analysis/pattern-card";
import { ReasoningCard } from "@/presentation/features/analysis/reasoning-card";
import { PerformanceCard } from "@/presentation/features/analysis/performance-card";
import { SimilarPatternsCard } from "@/presentation/features/analysis/similar-patterns-card";

interface AnalysisViewProps {
  data: AnalysisResult;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export function AnalysisView({ data, timeframe, onTimeframeChange }: AnalysisViewProps) {
  const precision = priceDecimals(data.pair.price);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
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
