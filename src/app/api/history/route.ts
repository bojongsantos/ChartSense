import { z } from "zod";
import { getJournalLimit } from "@/core/domain/access/journal";
import { setupSignature, summarizeJournal, type SetupOutcome } from "@/core/domain/journal/setup-outcome";
import { writeAuditLog } from "@/infrastructure/audit/audit-log";
import { requireUser } from "@/infrastructure/auth/current-user";
import { prisma } from "@/infrastructure/database/prisma";
import { apiError, getRequestIp, readJson } from "@/shared/server/http";

/** Keeps the history page bounded; older rows stay queryable by date filters. */
const PAGE_SIZE = 100;

const createSchema = z.object({
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

const entrySelect = {
  id: true,
  symbol: true,
  timeframe: true,
  direction: true,
  entry: true,
  target1: true,
  target2: true,
  stopLoss: true,
  riskReward: true,
  confidence: true,
  outcome: true,
  closedPrice: true,
  closedAt: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const user = await requireUser();
    const entries = await prisma.setupJournalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: entrySelect,
    });
    const stats = summarizeJournal(entries.map((entry) => entry.outcome as SetupOutcome));
    return Response.json({ entries, stats });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, createSchema);
    const signature = setupSignature(input);

    // Re-saving an existing setup only refreshes it, so the quota is checked
    // against genuinely new rows.
    const existing = await prisma.setupJournalEntry.findUnique({
      where: { userId_signature: { userId: user.id, signature } },
      select: { id: true },
    });
    if (!existing) {
      const limit = getJournalLimit(user.plan);
      const stored = await prisma.setupJournalEntry.count({ where: { userId: user.id } });
      if (stored >= limit) {
        return Response.json(
          {
            error: {
              code: "PLAN_LIMIT",
              message: `Batas ${limit} setup tersimpan untuk paket Anda. Hapus entri lama terlebih dahulu.`,
            },
          },
          { status: 403 },
        );
      }
    }

    // Saving the same plan twice updates the existing row instead of filling
    // the journal with copies of one setup.
    const entry = await prisma.setupJournalEntry.upsert({
      where: { userId_signature: { userId: user.id, signature } },
      create: { ...input, signature, userId: user.id },
      update: {
        target1: input.target1,
        target2: input.target2,
        riskReward: input.riskReward,
        confidence: input.confidence,
      },
      select: entrySelect,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "journal.save",
      entityType: "SetupJournalEntry",
      entityId: entry.id,
      metadata: { symbol: entry.symbol, timeframe: entry.timeframe, direction: entry.direction },
      ipAddress: getRequestIp(request),
    });

    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
