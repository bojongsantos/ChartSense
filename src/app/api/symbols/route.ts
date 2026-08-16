import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { fetchSpotUsdtSymbols } from "@/infrastructure/market-data/binance-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const symbols = await fetchSpotUsdtSymbols();
    return Response.json(
      { symbols },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch {
    return Response.json(
      { symbols: DEFAULT_WATCHLIST, fallback: true },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  }
}
