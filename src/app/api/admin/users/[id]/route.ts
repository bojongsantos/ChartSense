import { z } from "zod";
import { requireAdmin } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { apiError, getRequestIp, HttpError, readJson } from "@/shared/server/http";

const patchSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  plan: z.enum(["FREE", "PREMIUM"]).optional(),
}).refine((data) => data.role || data.plan, "Minimal satu perubahan diperlukan.");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = await readJson(request, patchSchema);
    if (id === admin.id && input.role === "USER") {
      throw new HttpError(400, "Admin tidak dapat menurunkan role sendiri.", "SELF_DEMOTION");
    }
    const user = await prisma.user.update({
      where: { id },
      data: input,
      select: { id: true, name: true, email: true, role: true, plan: true },
    });
    if (input.plan) {
      await prisma.subscription.upsert({
        where: { userId: id },
        create: { userId: id, plan: input.plan, status: input.plan === "PREMIUM" ? "ACTIVE" : "INACTIVE", provider: "admin" },
        update: { plan: input.plan, status: input.plan === "PREMIUM" ? "ACTIVE" : "INACTIVE", provider: "admin" },
      });
    }
    await writeAuditLog({ actorId: admin.id, action: "admin.user.update", entityType: "User", entityId: id, metadata: input, ipAddress: getRequestIp(request) });
    return Response.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
