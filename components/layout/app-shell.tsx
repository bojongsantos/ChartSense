"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { RightRail } from "@/components/right-rail/right-rail";
import { useMarketContext, useSentiment } from "@/lib/live";
import type { AnalysisResult, ScannerOpportunity } from "@/lib/types";

export function AppShell({
  children,
  analysis,
  opportunities,
}: {
  children: ReactNode;
  analysis?: AnalysisResult | null;
  opportunities?: ScannerOpportunity[] | null;
}) {
  const { context } = useMarketContext();
  const { sentiment } = useSentiment();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          <RightRail market={context} sentiment={sentiment} analysis={analysis} opportunities={opportunities} />
        </div>
      </div>
    </div>
  );
}
