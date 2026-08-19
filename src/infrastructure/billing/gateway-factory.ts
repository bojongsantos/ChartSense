import "server-only";

import type { BillingGateway } from "@/core/application/ports/billing-gateway";
import { DEFAULT_PAYMENT_PROVIDER } from "@/core/domain/billing/providers";
import { MidtransGateway } from "@/infrastructure/billing/midtrans/gateway";
import { NowPaymentsGateway } from "@/infrastructure/billing/nowpayments/gateway";
import { HttpError } from "@/shared/server/http";

/** The provider this deployment charges with. */
export function selectedPaymentProvider(): string {
  return process.env.PAYMENT_PROVIDER ?? DEFAULT_PAYMENT_PROVIDER;
}

function missing(variable: string): never {
  throw new HttpError(503, `${variable} belum dikonfigurasi.`, "PAYMENT_NOT_CONFIGURED");
}

/**
 * Builds a payment gateway.
 *
 * Lives apart from any single adapter so adding a provider never requires
 * editing another provider's file. Called without an argument it returns the
 * provider this deployment charges with; a webhook route passes its own name
 * instead, because a callback must be verified by the adapter that signed it
 * and not by whichever provider happens to be selected today. Without that,
 * switching `PAYMENT_PROVIDER` would silently start rejecting the callbacks of
 * orders that are still open with the old provider.
 *
 * An unknown or unconfigured value refuses to charge rather than falling back
 * to something the operator did not ask for.
 */
export function getBillingGateway(provider: string = selectedPaymentProvider()): BillingGateway {
  switch (provider) {
    case "midtrans": {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (!serverKey) missing("MIDTRANS_SERVER_KEY");
      return new MidtransGateway(serverKey, process.env.MIDTRANS_IS_PRODUCTION === "true");
    }
    case "nowpayments": {
      const apiKey = process.env.NOWPAYMENTS_API_KEY;
      if (!apiKey) missing("NOWPAYMENTS_API_KEY");
      const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
      if (!ipnSecret) missing("NOWPAYMENTS_IPN_SECRET");
      // The provider calls back to us and returns the buyer here afterwards,
      // so it needs an address reachable from outside this process.
      const publicUrl = process.env.BETTER_AUTH_URL;
      if (!publicUrl) missing("BETTER_AUTH_URL");
      return new NowPaymentsGateway({
        apiKey,
        ipnSecret,
        publicUrl: publicUrl.replace(/\/+$/, ""),
      });
    }
    default:
      throw new HttpError(
        503,
        `PAYMENT_PROVIDER "${provider}" tidak didukung.`,
        "PAYMENT_NOT_CONFIGURED",
      );
  }
}
