import type { Metadata } from "next";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { PricingModule } from "@/presentation/features/pricing/pricing-module";
import { AppShell } from "@/presentation/layout/app-shell";

export const metadata: Metadata = {
  title: "Pricing · Coin Secret",
  description: "Perbandingan paket Free dan Premium Coin Secret.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  // The price is decided on the server; the browser never proposes an amount.
  const priceIdr = Number.parseInt(process.env.PREMIUM_PRICE_IDR ?? "99000", 10);

  const subscription = user
    ? await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { currentPeriodEnd: true },
      })
    : null;

  return (
    <AppShell hideConviction hideMarketContext hideSentiment>
      <PricingModule
        priceIdr={Number.isFinite(priceIdr) ? priceIdr : 99_000}
        authenticated={user !== null}
        plan={user?.plan ?? null}
        periodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
      />
    </AppShell>
  );
}
