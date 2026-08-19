import type { Metadata } from "next";
import { HistoryModule } from "@/presentation/features/history/history-module";
import { AppShell } from "@/presentation/layout/app-shell";

export const metadata: Metadata = {
  title: "History · Coin Secret",
  description: "Riwayat setup tersimpan beserta hasilnya.",
};

export default function HistoryPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <HistoryModule />
    </AppShell>
  );
}
