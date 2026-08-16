import { AppShell } from "@/presentation/layout/app-shell";
import { WatchlistModule } from "@/presentation/features/watchlist/watchlist-module";

export default function WatchlistPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <WatchlistModule />
    </AppShell>
  );
}
