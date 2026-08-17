import { DEFAULT_WATCHLIST } from "@/config/default-watchlist";
import { fetchUsdtSymbolCatalog } from "@/infrastructure/market-data/market-data-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const symbols = await fetchUsdtSymbolCatalog();
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
