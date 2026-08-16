import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingGateway, CheckoutRequest, CheckoutResult, PaymentNotification } from "@/core/application/ports/billing-gateway";
import { HttpError } from "@/shared/server/http";

const notificationSchema = z.object({
  order_id: z.string().min(1).max(50),
  transaction_id: z.string().optional(),
  gross_amount: z.string().regex(/^\d+(\.\d{2})?$/),
  status_code: z.string(),
  transaction_status: z.string(),
  fraud_status: z.string().optional(),
  signature_key: z.string().length(128),
}).passthrough();

export class MidtransGateway implements BillingGateway {
  constructor(
    private readonly serverKey: string,
    private readonly production: boolean,
  ) {}

  async createCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
    const base = this.production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const response = await fetch(`${base}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${this.serverKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_details: { order_id: input.orderId, gross_amount: input.amount },
        item_details: [{ id: "chartsense-premium-30d", price: input.amount, quantity: 1, name: "ChartSense Premium 30 hari" }],
        customer_details: { first_name: input.customer.name, email: input.customer.email },
        expiry: { unit: "hours", duration: 24 },
      }),
    });
    const data = await response.json() as { token?: string; redirect_url?: string; error_messages?: string[] };
    if (!response.ok || !data.token || !data.redirect_url) {
      throw new HttpError(502, data.error_messages?.join(", ") ?? "Gateway pembayaran tidak tersedia.", "PAYMENT_GATEWAY_ERROR");
    }
    return { token: data.token, redirectUrl: data.redirect_url };
  }

  parseAndVerifyNotification(payload: unknown): PaymentNotification {
    const result = notificationSchema.safeParse(payload);
    if (!result.success) throw new HttpError(400, "Payload webhook tidak valid.", "INVALID_WEBHOOK");
    const data = result.data;
    const expected = createHash("sha512")
      .update(`${data.order_id}${data.status_code}${data.gross_amount}${this.serverKey}`)
      .digest("hex");
    const suppliedBuffer = Buffer.from(data.signature_key, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      throw new HttpError(401, "Tanda tangan webhook tidak valid.", "INVALID_SIGNATURE");
    }
    return {
      orderId: data.order_id,
      transactionId: data.transaction_id,
      grossAmount: data.gross_amount,
      statusCode: data.status_code,
      transactionStatus: data.transaction_status,
      fraudStatus: data.fraud_status,
      signatureKey: data.signature_key,
      raw: data,
    };
  }
}

export function getBillingGateway(): BillingGateway {
  if ((process.env.PAYMENT_PROVIDER ?? "midtrans") !== "midtrans") {
    throw new HttpError(503, "PAYMENT_PROVIDER tidak didukung.", "PAYMENT_NOT_CONFIGURED");
  }
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) throw new HttpError(503, "MIDTRANS_SERVER_KEY belum dikonfigurasi.", "PAYMENT_NOT_CONFIGURED");
  return new MidtransGateway(serverKey, process.env.MIDTRANS_IS_PRODUCTION === "true");
}
