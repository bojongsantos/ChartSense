"use client";

import type { AnalysisResult, MarketContext, ScannerOpportunity, SentimentData } from "@/lib/types";
import { ConvictionScoreCard } from "@/components/right-rail/conviction-score-card";
import { MarketContextCard } from "@/components/right-rail/market-context-card";
import { MarketSentimentCard } from "@/components/right-rail/market-sentiment-card";
import { marketFallback, sentimentFallback } from "@/lib/static-rail";
import { buildConviction, type ConvictionScore } from "@/lib/conviction";

interface RightRailProps {
  market: MarketContext | null;
  sentiment: SentimentData | null;
  analysis?: AnalysisResult | null;
  opportunities?: ScannerOpportunity[] | null;
  hideConviction?: boolean;
  hideMarketContext?: boolean;
  hideSentiment?: boolean;
}

const waitingConviction: ConvictionScore = {
  score: 0,
  grade: "F",
  interpretation: "",
  components: [],
};

function convictionFromAnalysis(analysis: AnalysisResult): ConvictionScore {
  const shape = analysis.pattern.shape;
  const setup = shape?.setup;
  const zone = shape?.zones?.find((z) => z.id === setup?.zoneId) ?? shape?.zones?.[0];
  if (!zone) {
    return buildConviction({ confidence: analysis.pattern.confidence });
  }
  return buildConviction({
    confidence: setup?.confidence ?? zone.confidence,
    narrowness: zone.narrowness,
    strength: zone.strength,
    touches: zone.touches,
  });
}

function convictionFromScan(opp: ScannerOpportunity): ConvictionScore {
  return buildConviction({
    confidence: opp.confidence,
    narrowness: opp.narrowness,
    strength: opp.strength,
    touches: opp.touches,
  });
}

export function RightRail({
  market,
  sentiment,
  analysis,
  opportunities,
  hideConviction,
  hideMarketContext,
  hideSentiment,
}: RightRailProps) {
  const conviction =
    analysis !== undefined && analysis !== null
      ? convictionFromAnalysis(analysis)
      : opportunities && opportunities.length > 0
        ? convictionFromScan(opportunities[0])
        : waitingConviction;

  // When every card is hidden the rail serves no purpose — remove it entirely
  // so the main content expands to the full remaining viewport width.
  if (hideConviction && hideMarketContext && hideSentiment) return null;

  return (
    <aside className="hidden w-[340px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-4 xl:flex">
      {!hideConviction && <ConvictionScoreCard data={conviction} />}
      {!hideMarketContext && <MarketContextCard data={market ?? marketFallback} />}
      {!hideSentiment && <MarketSentimentCard data={sentiment ?? sentimentFallback} />}
    </aside>
  );
}
