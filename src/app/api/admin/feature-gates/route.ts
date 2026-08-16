import { z } from "zod";
import { requireAdmin } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, readJson } from "@/shared/server/http";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";

const gateSchema = z.object({ feature: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{2,64}$/), free: z.boolean(), premium: z.boolean() });

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ gates: await prisma.featureGate.findMany({ orderBy: { feature: "asc" } }) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = await readJson(request, gateSchema);
    const gate = await prisma.featureGate.upsert({ where: { feature: input.feature }, create: input, update: input });
    await writeAuditLog({ actorId: admin.id, action: "admin.feature-gate.update", entityType: "FeatureGate", entityId: gate.id, metadata: input, ipAddress: getRequestIp(request) });
    return Response.json({ gate });
  } catch (error) {
    return apiError(error);
  }
}
