import { requireAdmin } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError } from "@/shared/server/http";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const status = new URL(request.url).searchParams.get("status");
    const allowed = ["PENDING", "SETTLED", "FAILED", "EXPIRED", "CANCELED", "REFUNDED"] as const;
    const selected = allowed.find((value) => value === status);
    const payments = await prisma.payment.findMany({
      where: selected ? { status: selected } : undefined,
      orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, orderId: true, providerTransactionId: true, amount: true, currency: true, status: true, rawStatus: true, createdAt: true, paidAt: true, user: { select: { id: true, name: true, email: true } } },
    });
    return Response.json({ payments });
  } catch (error) {
    return apiError(error);
  }
}
