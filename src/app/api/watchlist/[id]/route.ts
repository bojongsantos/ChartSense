import { z } from "zod";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, HttpError, readJson } from "@/shared/server/http";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";

const patchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = await readJson(request, patchSchema);
    const result = await prisma.watchlistItem.updateMany({ where: { id, userId: user.id }, data: input });
    if (!result.count) throw new HttpError(404, "Item watchlist tidak ditemukan.", "NOT_FOUND");
    await writeAuditLog({ actorId: user.id, action: "watchlist.update", entityType: "WatchlistItem", entityId: id, metadata: input, ipAddress: getRequestIp(request) });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const result = await prisma.watchlistItem.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) throw new HttpError(404, "Item watchlist tidak ditemukan.", "NOT_FOUND");
    await writeAuditLog({ actorId: user.id, action: "watchlist.delete", entityType: "WatchlistItem", entityId: id, ipAddress: getRequestIp(request) });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
