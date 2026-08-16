import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError } from "@/shared/server/http";

export async function GET() {
  try {
    const user = await requireUser();
    const [subscription, payments] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId: user.id }, select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true } }),
      prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, orderId: true, amount: true, currency: true, status: true, createdAt: true, paidAt: true, checkoutUrl: true } }),
    ]);
    return Response.json({ subscription, payments });
  } catch (error) {
    return apiError(error);
  }
}
