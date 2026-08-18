import { z } from "zod";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, readJson } from "@/shared/server/http";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { getWatchlistLimit } from "@/core/domain/access/watchlist";

const symbolSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/);
const createSchema = z.object({ symbol: symbolSchema });

export async function GET() {
  try {
    const user = await requireUser();
    const limit = getWatchlistLimit(user.plan);
    const items = await prisma.watchlistItem.findMany({
      where: { userId: user.id, position: { lt: limit } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        symbol: true,
        enabled: true,
        position: true,
        setupTimeframe: true,
        setupDirection: true,
        setupEntry: true,
        setupTarget1: true,
        setupStopLoss: true,
        setupConfidence: true,
        setupSavedAt: true,
      },
    });
    return Response.json({ items, plan: user.plan, limit });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { symbol } = await readJson(request, createSchema);
    const limit = getWatchlistLimit(user.plan);
    const count = await prisma.watchlistItem.count({ where: { userId: user.id, position: { lt: limit } } });
    if (count >= limit) {
      return Response.json({ error: { code: "PLAN_LIMIT", message: `Batas watchlist ${limit} simbol.` } }, { status: 403 });
    }
    const item = await prisma.watchlistItem.create({
      data: { userId: user.id, symbol, position: count },
      select: { id: true, symbol: true, enabled: true, position: true },
    });
    await writeAuditLog({ actorId: user.id, action: "watchlist.create", entityType: "WatchlistItem", entityId: item.id, metadata: { symbol }, ipAddress: getRequestIp(request) });
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return Response.json({ error: { code: "DUPLICATE_SYMBOL", message: "Simbol sudah ada." } }, { status: 409 });
    }
    return apiError(error);
  }
}
