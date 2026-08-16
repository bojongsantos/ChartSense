import { requireAdmin } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError } from "@/shared/server/http";

export async function GET() {
  try {
    await requireAdmin();
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" }, take: 200,
      select: { id: true, action: true, entityType: true, entityId: true, metadata: true, ipAddress: true, createdAt: true, actor: { select: { id: true, email: true, name: true } } },
    });
    return Response.json({ logs });
  } catch (error) {
    return apiError(error);
  }
}
