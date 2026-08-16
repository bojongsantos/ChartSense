import { AppShell } from "@/presentation/layout/app-shell";
import { PatternsView } from "@/presentation/features/signals/patterns-view";

export const dynamic = "force-dynamic";

export default function PatternsPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <PatternsView />
    </AppShell>
  );
}
