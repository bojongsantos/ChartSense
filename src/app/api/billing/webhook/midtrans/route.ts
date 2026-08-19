import {
  amountsMatch,
  decidePayment,
  extendPeriod,
  shouldGrantAccess,
  shouldRevokeAccess,
  type PaymentStatus,
} from "@/core/domain/billing/payment-rules";
import { getBillingGateway } from "@/infrastructure/billing/gateway-factory";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, HttpError } from "@/shared/server/http";

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const event = getBillingGateway().parseAndVerifyNotification({
      payload,
      headers: request.headers,
    });
    const payment = await prisma.payment.findUnique({ where: { orderId: event.orderId } });
    if (!payment) throw new HttpError(404, "Order pembayaran tidak ditemukan.", "ORDER_NOT_FOUND");
    if (!amountsMatch(event.paidAmount, payment.amount)) {
      throw new HttpError(400, "Nominal pembayaran tidak sesuai.", "AMOUNT_MISMATCH");
    }
    const { status, successful } = decidePayment(event.outcome);
    const storedStatus = payment.status as PaymentStatus;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          rawStatus: event.providerStatus,
          providerTransactionId: event.providerTransactionId,
          paidAt: successful ? (payment.paidAt ?? new Date()) : payment.paidAt,
        },
      });
      if (shouldGrantAccess(storedStatus, successful)) {
        const now = new Date();
        const current = await tx.subscription.findUnique({ where: { userId: payment.userId } });
        const periodEnd = extendPeriod(current?.currentPeriodEnd, now);
        await tx.user.update({ where: { id: payment.userId }, data: { plan: "PREMIUM" } });
        await tx.subscription.upsert({
          where: { userId: payment.userId },
          create: { userId: payment.userId, provider: "midtrans", plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
          update: { provider: "midtrans", plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false },
        });
        await tx.auditLog.create({ data: { actorId: payment.userId, action: "billing.payment.settled", entityType: "Payment", entityId: payment.id, metadata: { orderId: payment.orderId, periodEnd: periodEnd.toISOString() } } });
      } else if (shouldRevokeAccess(status, storedStatus)) {
        await tx.user.update({ where: { id: payment.userId }, data: { plan: "FREE" } });
        await tx.subscription.updateMany({ where: { userId: payment.userId, provider: "midtrans" }, data: { plan: "FREE", status: "CANCELED", currentPeriodEnd: new Date() } });
        await tx.auditLog.create({ data: { actorId: payment.userId, action: "billing.payment.refunded", entityType: "Payment", entityId: payment.id, metadata: { orderId: payment.orderId } } });
      }
    });
    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
