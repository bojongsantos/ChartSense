import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { parseScanSymbols } from "@/core/application/scanner/scan-request";
import { runScannerCached } from "@/core/application/scanner/scanner-service";
import { binanceMarketData } from "@/infrastructure/market-data/binance-client";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { canUserAccessFeature } from "@/infrastructure/auth/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { symbols?: unknown; force?: unknown };
    const user = await getCurrentUser();
    const extended = await canUserAccessFeature(user, "scannerExtended");
    const symbols = (parseScanSymbols(body.symbols) ?? DEFAULT_WATCHLIST).slice(0, extended ? 200 : 20);
    const result = await runScannerCached(binanceMarketData, symbols, body.force === true);
    const payload = extended ? result : { ...result, opportunities: result.opportunities.slice(0, 2) };
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scanner unavailable";
    const badRequest = message.startsWith("symbols");
    return Response.json({ error: message }, { status: badRequest ? 400 : 503 });
  }
}
