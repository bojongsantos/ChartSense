import type { Metadata } from "next";
import { AlertsModule } from "@/presentation/features/alerts/alerts-module";
import { AppShell } from "@/presentation/layout/app-shell";

export const metadata: Metadata = {
  title: "Alerts · Coin Secret",
  description: "Pemberitahuan saat harga menyentuh level yang Anda tentukan.",
};

export default function AlertsPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <AlertsModule />
    </AppShell>
  );
}
