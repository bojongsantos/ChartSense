import { z } from "zod";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, HttpError, readJson } from "@/shared/server/http";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { status } = await readJson(request, updateSchema);

    // Scoping the update by userId is what prevents one account from
    // re-arming another account's alert by guessing its id.
    const result = await prisma.priceAlert.updateMany({
      where: { id, userId: user.id },
      data: { status, triggeredAt: null, triggeredPrice: null },
    });
    if (result.count === 0) throw new HttpError(404, "Alert tidak ditemukan.", "NOT_FOUND");

    await writeAuditLog({
      actorId: user.id,
      action: "alert.update",
      entityType: "PriceAlert",
      entityId: id,
      metadata: { status },
      ipAddress: getRequestIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const result = await prisma.priceAlert.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) throw new HttpError(404, "Alert tidak ditemukan.", "NOT_FOUND");

    await writeAuditLog({
      actorId: user.id,
      action: "alert.delete",
      entityType: "PriceAlert",
      entityId: id,
      ipAddress: getRequestIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
