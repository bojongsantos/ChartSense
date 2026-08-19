import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { AccountModule } from "@/presentation/features/account/account-module";
import { AppShell } from "@/presentation/layout/app-shell";
import { providerCopy } from "@/core/domain/billing/provider-copy";
import { selectedPaymentProvider } from "@/infrastructure/billing/gateway-factory";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const premiumPriceIdr = Number.parseInt(process.env.PREMIUM_PRICE_IDR ?? "99000", 10);
  const provider = providerCopy(selectedPaymentProvider());
  return <AppShell hideConviction hideMarketContext hideSentiment><AccountModule user={user} premiumPriceIdr={premiumPriceIdr} provider={provider} /></AppShell>;
}
