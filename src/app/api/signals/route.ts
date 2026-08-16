import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { parseScanSymbols } from "@/core/application/scanner/scan-request";
import { rankTopSetups, runSdScanCached } from "@/core/application/scanner/supply-demand-scan-service";
import { binanceMarketData } from "@/infrastructure/market-data/binance-client";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { canUserAccessFeature } from "@/infrastructure/auth/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { symbols?: unknown; force?: unknown; limit?: unknown };
    const user = await getCurrentUser();
    const fullAccess = await canUserAccessFeature(user, "signals");
    const symbols = (parseScanSymbols(body.symbols) ?? DEFAULT_WATCHLIST).slice(0, fullAccess ? 200 : 20);
    const limit = typeof body.limit === "number" ? Math.min(10, Math.max(1, Math.trunc(body.limit))) : 5;
    const full = await runSdScanCached(binanceMarketData, symbols, body.force === true);
    const top = rankTopSetups(full, limit);
    const result = fullAccess
      ? full
      : { ...full, demand: full.demand.slice(0, 3), supply: full.supply.slice(0, 3) };
    return Response.json({ result, top }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signals unavailable";
    const badRequest = message.startsWith("symbols");
    return Response.json({ error: message }, { status: badRequest ? 400 : 503 });
  }
}
