import type { Metadata } from "next";
import { TutorialsModule } from "@/presentation/features/tutorials/tutorials-module";
import { AppShell } from "@/presentation/layout/app-shell";

export const metadata: Metadata = {
  title: "Tutorials · Coin Secret",
  description: "Panduan membaca zona supply & demand, setup, dan confidence score Coin Secret.",
};

export default function TutorialsPage() {
  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <TutorialsModule />
    </AppShell>
  );
}
