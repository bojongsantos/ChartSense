import { getBillingGateway } from "@/infrastructure/billing/midtrans-gateway";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, HttpError } from "@/shared/server/http";

function mappedStatus(status: string) {
  if (status === "settlement" || status === "capture") return "SETTLED" as const;
  if (status === "expire") return "EXPIRED" as const;
  if (status === "cancel") return "CANCELED" as const;
  if (status === "refund" || status === "partial_refund") return "REFUNDED" as const;
  if (status === "deny" || status === "failure") return "FAILED" as const;
  return "PENDING" as const;
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const notification = getBillingGateway().parseAndVerifyNotification(payload);
    const payment = await prisma.payment.findUnique({ where: { orderId: notification.orderId } });
    if (!payment) throw new HttpError(404, "Order pembayaran tidak ditemukan.", "ORDER_NOT_FOUND");
    if (Number(notification.grossAmount) !== payment.amount) {
      throw new HttpError(400, "Nominal pembayaran tidak sesuai.", "AMOUNT_MISMATCH");
    }
    const receivedStatus = mappedStatus(notification.transactionStatus);
    const successful = receivedStatus === "SETTLED"
      && notification.statusCode === "200"
      && (!notification.fraudStatus || notification.fraudStatus.toLowerCase() === "accept");
    const status = receivedStatus === "SETTLED" && !successful ? "PENDING" : receivedStatus;

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          rawStatus: notification.transactionStatus,
          providerTransactionId: notification.transactionId,
          paidAt: successful ? (payment.paidAt ?? new Date()) : payment.paidAt,
        },
      });
      if (successful && payment.status !== "SETTLED") {
        const now = new Date();
        const current = await tx.subscription.findUnique({ where: { userId: payment.userId } });
        const base = current?.currentPeriodEnd && current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
        const periodEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
        await tx.user.update({ where: { id: payment.userId }, data: { plan: "PREMIUM" } });
        await tx.subscription.upsert({
          where: { userId: payment.userId },
          create: { userId: payment.userId, provider: "midtrans", plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
          update: { provider: "midtrans", plan: "PREMIUM", status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false },
        });
        await tx.auditLog.create({ data: { actorId: payment.userId, action: "billing.payment.settled", entityType: "Payment", entityId: payment.id, metadata: { orderId: payment.orderId, periodEnd: periodEnd.toISOString() } } });
      } else if (status === "REFUNDED" && payment.status === "SETTLED") {
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
