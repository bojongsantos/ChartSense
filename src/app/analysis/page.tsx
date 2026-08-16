import { AnalysisClient } from "@/presentation/features/analysis/analysis-client";
import { isValidBinanceSymbol, normalizeUsdtSymbol } from "@/core/domain/market/symbol";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;
  const candidate = raw ? normalizeUsdtSymbol(raw) : "BTCUSDT";
  const symbol = isValidBinanceSymbol(candidate) ? candidate : "BTCUSDT";

  return <AnalysisClient initialSymbol={symbol} />;
}
