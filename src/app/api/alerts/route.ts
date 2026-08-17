import { z } from "zod";
import { getAlertLimit } from "@/core/domain/alerts/alert-rules";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, readJson } from "@/shared/server/http";

const createSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/),
  condition: z.enum(["PRICE_ABOVE", "PRICE_BELOW"]),
  threshold: z.number().positive().finite(),
  note: z.string().trim().max(140).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        symbol: true,
        condition: true,
        threshold: true,
        status: true,
        note: true,
        triggeredAt: true,
        triggeredPrice: true,
        createdAt: true,
      },
    });
    const limit = getAlertLimit(user.plan === "PREMIUM" ? "premium" : "free");
    return Response.json({ alerts, limit });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, createSchema);
    const limit = getAlertLimit(user.plan === "PREMIUM" ? "premium" : "free");

    // Only armed alerts consume the quota; resolved ones are history.
    const armed = await prisma.priceAlert.count({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAUSED"] } },
    });
    if (armed >= limit) {
      return Response.json(
        {
          error: {
            code: "PLAN_LIMIT",
            message: `Batas ${limit} alert aktif untuk paket Anda.`,
          },
        },
        { status: 403 },
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id,
        symbol: input.symbol,
        condition: input.condition,
        threshold: input.threshold,
        note: input.note ?? null,
      },
      select: {
        id: true,
        symbol: true,
        condition: true,
        threshold: true,
        status: true,
        note: true,
        triggeredAt: true,
        triggeredPrice: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "alert.create",
      entityType: "PriceAlert",
      entityId: alert.id,
      metadata: { symbol: alert.symbol, condition: alert.condition, threshold: alert.threshold },
      ipAddress: getRequestIp(request),
    });

    return Response.json({ alert }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
