import { AppShell } from "@/components/layout/app-shell";
import { PatternsView } from "@/components/patterns/patterns-view";

export const dynamic = "force-dynamic";

export default function PatternsPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <PatternsView />
    </AppShell>
  );
}
