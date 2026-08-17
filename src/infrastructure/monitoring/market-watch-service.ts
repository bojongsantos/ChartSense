import "server-only";

import { NOTIFICATION_RETENTION } from "@/core/domain/access/journal";
import {
  describeAlert,
  isAlertTriggered,
  type AlertCondition,
} from "@/core/domain/alerts/alert-rules";
import {
  priceWindowSince,
  resolveSetupOutcome,
  type JournalSetup,
  type SetupOutcome,
} from "@/core/domain/journal/setup-outcome";
import type { SetupDirection, Timeframe } from "@/core/domain/models";
import { prisma } from "@/infrastructure/database/prisma";
import { marketData } from "@/infrastructure/market-data/market-data-provider";

export interface MarketWatchReport {
  checkedAlerts: number;
  triggeredAlerts: number;
  checkedSetups: number;
  resolvedSetups: number;
  /** Symbols whose price could not be read this run. */
  skippedSymbols: string[];
}

const JOURNAL_CANDLE_LIMIT = 1_000;

/**
 * Hourly bars resolve a setup within an hour of the level being touched, but
 * 1000 of them only reach back ~41 days. Older setups fall back to daily bars,
 * which reach ~2.7 years at the cost of a coarser resolution moment.
 */
const HOURLY_COVERAGE_SECONDS = JOURNAL_CANDLE_LIMIT * 3_600;

function evaluationTimeframe(oldestSeconds: number, nowSeconds: number): Timeframe {
  return nowSeconds - oldestSeconds < HOURLY_COVERAGE_SECONDS ? "1H" : "1D";
}

function outcomeMessage(symbol: string, outcome: SetupOutcome): string {
  return outcome === "TARGET_HIT"
    ? `Setup ${symbol} mencapai target pertama.`
    : `Setup ${symbol} kena stop loss.`;
}

/**
 * One sweep of everything that watches the market on the user's behalf:
 * price alerts fire from the live ticker, and open journal setups are
 * resolved against the daily range since they were recorded.
 *
 * Designed to be idempotent — an alert already TRIGGERED and a setup already
 * closed are both excluded by the queries, so a repeated run is harmless.
 */
export async function runMarketWatch(): Promise<MarketWatchReport> {
  const [alerts, setups] = await Promise.all([
    prisma.priceAlert.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true, symbol: true, condition: true, threshold: true },
    }),
    prisma.setupJournalEntry.findMany({
      where: { outcome: "OPEN" },
      select: {
        id: true,
        userId: true,
        symbol: true,
        direction: true,
        entry: true,
        target1: true,
        stopLoss: true,
        createdAt: true,
      },
    }),
  ]);

  const report: MarketWatchReport = {
    checkedAlerts: alerts.length,
    triggeredAlerts: 0,
    checkedSetups: setups.length,
    resolvedSetups: 0,
    skippedSymbols: [],
  };
  if (alerts.length === 0 && setups.length === 0) return report;

  const alertSymbols = [...new Set(alerts.map((alert) => alert.symbol))];
  const tickers = alertSymbols.length > 0 ? await marketData.fetchTickers24h(alertSymbols) : [];
  const priceBySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker.lastPrice]));

  const notifications: {
    userId: string;
    kind: "ALERT_TRIGGERED" | "SETUP_RESOLVED";
    title: string;
    body: string;
    link: string;
  }[] = [];
  const now = new Date();

  for (const alert of alerts) {
    const price = priceBySymbol.get(alert.symbol);
    if (price === undefined) {
      if (!report.skippedSymbols.includes(alert.symbol)) report.skippedSymbols.push(alert.symbol);
      continue;
    }
    const trigger = { condition: alert.condition as AlertCondition, threshold: alert.threshold };
    if (!isAlertTriggered(trigger, price)) continue;

    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: { status: "TRIGGERED", triggeredAt: now, triggeredPrice: price },
    });
    notifications.push({
      userId: alert.userId,
      kind: "ALERT_TRIGGERED",
      title: `Alert ${alert.symbol} tercapai`,
      body: describeAlert(alert.symbol, trigger, price),
      link: `/analysis?symbol=${alert.symbol}`,
    });
    report.triggeredAlerts++;
  }

  // Journal setups need the range travelled since they were saved, which the
  // 24h ticker cannot provide — so read candles once per symbol, at the finest
  // interval that still reaches back to the oldest open setup for that symbol.
  const nowSeconds = Math.floor(now.getTime() / 1_000);
  const oldestBySymbol = new Map<string, number>();
  for (const setup of setups) {
    const created = Math.floor(setup.createdAt.getTime() / 1_000);
    const current = oldestBySymbol.get(setup.symbol);
    if (current === undefined || created < current) oldestBySymbol.set(setup.symbol, created);
  }

  const candlesBySymbol = new Map<string, { time: number; high: number; low: number }[]>();
  await Promise.all(
    [...oldestBySymbol].map(async ([symbol, oldest]) => {
      try {
        const candles = await marketData.fetchKlines({
          symbol,
          timeframe: evaluationTimeframe(oldest, nowSeconds),
          limit: JOURNAL_CANDLE_LIMIT,
        });
        candlesBySymbol.set(symbol, candles);
      } catch {
        if (!report.skippedSymbols.includes(symbol)) report.skippedSymbols.push(symbol);
      }
    }),
  );

  for (const setup of setups) {
    const candles = candlesBySymbol.get(setup.symbol);
    if (!candles || candles.length === 0) continue;

    const window = priceWindowSince(candles, Math.floor(setup.createdAt.getTime() / 1_000));
    if (!window) continue;

    const plan: JournalSetup = {
      direction: setup.direction as SetupDirection,
      entry: setup.entry,
      target1: setup.target1,
      stopLoss: setup.stopLoss,
    };
    const outcome = resolveSetupOutcome(plan, window);
    if (outcome === "OPEN") continue;

    await prisma.setupJournalEntry.update({
      where: { id: setup.id },
      data: {
        outcome,
        closedAt: now,
        closedPrice: outcome === "TARGET_HIT" ? setup.target1 : setup.stopLoss,
      },
    });
    notifications.push({
      userId: setup.userId,
      kind: "SETUP_RESOLVED",
      title: `Setup ${setup.symbol} selesai`,
      body: outcomeMessage(setup.symbol, outcome),
      link: "/history",
    });
    report.resolvedSetups++;
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
    await pruneNotifications([...new Set(notifications.map((item) => item.userId))]);
  }
  return report;
}

/**
 * Keeps each affected user's feed bounded. Without this the table only ever
 * grows, since nothing else deletes a notification once it has been read.
 */
async function pruneNotifications(userIds: string[]): Promise<void> {
  await Promise.all(
    userIds.map(async (userId) => {
      const survivors = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: NOTIFICATION_RETENTION,
        select: { id: true },
      });
      if (survivors.length < NOTIFICATION_RETENTION) return;
      await prisma.notification.deleteMany({
        where: { userId, id: { notIn: survivors.map((item) => item.id) } },
      });
    }),
  );
}
