import "server-only";

import type { BillingGateway } from "@/core/application/ports/billing-gateway";
import { MidtransGateway } from "@/infrastructure/billing/midtrans/gateway";
import { HttpError } from "@/shared/server/http";

/**
 * Chooses the payment provider for this deployment.
 *
 * Lives apart from any single adapter so adding a provider never requires
 * editing another provider's file. Selection is by `PAYMENT_PROVIDER`, and an
 * unknown or unconfigured value refuses to charge rather than falling back to
 * something the operator did not ask for.
 */
export function getBillingGateway(): BillingGateway {
  const provider = process.env.PAYMENT_PROVIDER ?? "midtrans";

  switch (provider) {
    case "midtrans": {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (!serverKey) {
        throw new HttpError(
          503,
          "MIDTRANS_SERVER_KEY belum dikonfigurasi.",
          "PAYMENT_NOT_CONFIGURED",
        );
      }
      return new MidtransGateway(serverKey, process.env.MIDTRANS_IS_PRODUCTION === "true");
    }
    default:
      throw new HttpError(
        503,
        `PAYMENT_PROVIDER "${provider}" tidak didukung.`,
        "PAYMENT_NOT_CONFIGURED",
      );
  }
}
