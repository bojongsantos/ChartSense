import { z } from "zod";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, HttpError, readJson } from "@/shared/server/http";

const updateSchema = z.object({ outcome: z.literal("CANCELED") });

type RouteContext = { params: Promise<{ id: string }> };

/** Lets a trader close a setup they abandoned, without faking a market result. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { outcome } = await readJson(request, updateSchema);

    const result = await prisma.setupJournalEntry.updateMany({
      where: { id, userId: user.id, outcome: "OPEN" },
      data: { outcome, closedAt: new Date() },
    });
    if (result.count === 0) {
      throw new HttpError(404, "Setup terbuka tidak ditemukan.", "NOT_FOUND");
    }
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const result = await prisma.setupJournalEntry.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) throw new HttpError(404, "Entri tidak ditemukan.", "NOT_FOUND");

    await writeAuditLog({
      actorId: user.id,
      action: "journal.delete",
      entityType: "SetupJournalEntry",
      entityId: id,
      ipAddress: getRequestIp(request),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
