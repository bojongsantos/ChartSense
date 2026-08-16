"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/presentation/layout/sidebar";
import { TopNav } from "@/presentation/layout/top-nav";
import { MobileNav } from "@/presentation/layout/mobile-nav";
import { RightRail } from "@/presentation/widgets/right-rail/right-rail";
import { useMarketContext } from "@/presentation/hooks/use-market-context";
import type { AnalysisResult, ScannerOpportunity } from "@/core/domain/models";

export function AppShell({
  children,
  analysis,
  opportunities,
  hideConviction,
  hideMarketContext,
  hideSentiment,
}: {
  children: ReactNode;
  analysis?: AnalysisResult | null;
  opportunities?: ScannerOpportunity[] | null;
  hideConviction?: boolean;
  hideMarketContext?: boolean;
  hideSentiment?: boolean;
}) {
  const showMarketData = !hideMarketContext || !hideSentiment;
  const { context, sentiment } = useMarketContext(showMarketData);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
          <RightRail
            market={context}
            sentiment={sentiment}
            analysis={analysis}
            opportunities={opportunities}
            hideConviction={hideConviction}
            hideMarketContext={hideMarketContext}
            hideSentiment={hideSentiment}
          />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
