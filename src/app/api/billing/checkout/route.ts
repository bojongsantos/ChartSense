import { randomUUID } from "node:crypto";
import { requireUser } from "@/infrastructure/auth/current-user";
import { getBillingGateway } from "@/infrastructure/billing/midtrans-gateway";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp } from "@/shared/server/http";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const amount = Number.parseInt(process.env.PREMIUM_PRICE_IDR ?? "99000", 10);
    const recent = await prisma.payment.findFirst({
      where: { userId: user.id, status: "PENDING", createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) }, checkoutUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { orderId: true, amount: true, checkoutToken: true, checkoutUrl: true },
    });
    if (recent?.checkoutUrl && recent.checkoutToken) {
      return Response.json({ orderId: recent.orderId, amount: recent.amount, currency: "IDR", token: recent.checkoutToken, redirectUrl: recent.checkoutUrl });
    }
    const orderId = `CS-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const payment = await prisma.payment.create({
      data: { orderId, userId: user.id, amount, provider: "midtrans" },
      select: { id: true },
    });
    try {
      const checkout = await getBillingGateway().createCheckout({
        orderId,
        amount,
        customer: { name: user.name, email: user.email },
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { checkoutToken: checkout.token, checkoutUrl: checkout.redirectUrl, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      await writeAuditLog({ actorId: user.id, action: "billing.checkout.create", entityType: "Payment", entityId: payment.id, metadata: { orderId, amount }, ipAddress: getRequestIp(request) });
      return Response.json({ orderId, amount, currency: "IDR", ...checkout }, { status: 201 });
    } catch (error) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      throw error;
    }
  } catch (error) {
    return apiError(error);
  }
}
