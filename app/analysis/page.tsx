import { AnalysisClient } from "@/components/analysis/analysis-client";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.symbol) ? params.symbol[0] : params.symbol;
  const symbol = raw && /^[A-Z0-9]{4,20}$/.test(raw) ? raw.toUpperCase() : "BTCUSDT";

  return <AnalysisClient initialSymbol={symbol} />;
}
