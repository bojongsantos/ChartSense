import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { createFixedWindowLimiter } from "@/core/application/rate-limit/fixed-window";
import { parseScanSymbols } from "@/core/application/scanner/scan-request";
import { rankTopSetups, runSdScanCached } from "@/core/application/scanner/supply-demand-scan-service";
import { marketData } from "@/infrastructure/market-data/market-data-provider";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { canUserAccessFeature } from "@/infrastructure/auth/entitlements";
import { getRequestIp, tooManyRequests } from "@/shared/server/http";

export const runtime = "nodejs";

/** Same fan-out exposure as the scanner, so the same guard applies. */
const limiter = createFixedWindowLimiter({ limit: 20, windowMs: 60_000 });

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const decision = limiter.check(user?.id ?? getRequestIp(request) ?? "anonymous");
    if (!decision.allowed) return tooManyRequests(decision.retryAfterSeconds);

    const body = (await request.json()) as { symbols?: unknown; force?: unknown; limit?: unknown };
    const fullAccess = await canUserAccessFeature(user, "signals");
    // Anonymous callers stay on the default list; see the scanner route.
    const requested = user ? parseScanSymbols(body.symbols) : undefined;
    const symbols = (requested ?? DEFAULT_WATCHLIST).slice(0, fullAccess ? 200 : 20);
    const limit = typeof body.limit === "number" ? Math.min(10, Math.max(1, Math.trunc(body.limit))) : 5;

    const full = await runSdScanCached(marketData, symbols, user !== null && body.force === true);
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
