import { z } from "zod";
import { getWatchlistLimit } from "@/core/domain/access/watchlist";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, readJson } from "@/shared/server/http";

const saveSchema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,20}$/),
  timeframe: z.enum(["15m", "1H", "4H", "1D"]),
  direction: z.enum(["long", "short"]),
  entry: z.number().positive().finite(),
  target1: z.number().positive().finite(),
  target2: z.number().positive().finite(),
  stopLoss: z.number().positive().finite(),
  riskReward: z.number().finite(),
  confidence: z.number().int().min(0).max(100),
});

/**
 * Pins a setup to the user's watchlist.
 *
 * The symbol is added if it is not there yet, otherwise the existing entry
 * simply carries the newer setup. Saving the same plan twice is therefore
 * idempotent rather than a duplicate row or a 409.
 */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, saveSchema);
    const limit = getWatchlistLimit(user.plan);

    const snapshot = {
      setupTimeframe: input.timeframe,
      setupDirection: input.direction,
      setupEntry: input.entry,
      setupTarget1: input.target1,
      setupTarget2: input.target2,
      setupStopLoss: input.stopLoss,
      setupRiskReward: input.riskReward,
      setupConfidence: input.confidence,
      setupSavedAt: new Date(),
    };

    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_symbol: { userId: user.id, symbol: input.symbol } },
      select: { id: true, position: true },
    });

    // Only a brand-new symbol consumes a watchlist slot.
    if (!existing) {
      const count = await prisma.watchlistItem.count({
        where: { userId: user.id, position: { lt: limit } },
      });
      if (count >= limit) {
        return Response.json(
          {
            error: {
              code: "PLAN_LIMIT",
              message: `Batas watchlist ${limit} simbol. Hapus satu coin terlebih dahulu.`,
            },
          },
          { status: 403 },
        );
      }
      const created = await prisma.watchlistItem.create({
        data: { userId: user.id, symbol: input.symbol, position: count, ...snapshot },
        select: { id: true, symbol: true, enabled: true, position: true },
      });
      await writeAuditLog({
        actorId: user.id,
        action: "watchlist.setup.save",
        entityType: "WatchlistItem",
        entityId: created.id,
        metadata: { symbol: input.symbol, timeframe: input.timeframe, direction: input.direction },
        ipAddress: getRequestIp(request),
      });
      return Response.json({ item: created, created: true }, { status: 201 });
    }

    const updated = await prisma.watchlistItem.update({
      where: { id: existing.id },
      data: snapshot,
      select: { id: true, symbol: true, enabled: true, position: true },
    });
    await writeAuditLog({
      actorId: user.id,
      action: "watchlist.setup.save",
      entityType: "WatchlistItem",
      entityId: updated.id,
      metadata: { symbol: input.symbol, timeframe: input.timeframe, direction: input.direction },
      ipAddress: getRequestIp(request),
    });
    return Response.json({ item: updated, created: false });
  } catch (error) {
    return apiError(error);
  }
}
