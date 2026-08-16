interface HealthResult {
  id: string;
  name: string;
  endpoint: string;
  status: "ok" | "down";
  latencyMs: number;
  detail: string;
}

async function check(
  id: string,
  name: string,
  endpoint: string,
  urls: string[],
): Promise<HealthResult> {
  const start = performance.now();
  try {
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
          headers: { Accept: "application/json" },
        }),
      ),
    );
    const failed = responses.find((response) => !response.ok);
    if (failed) throw new Error(`HTTP ${failed.status}`);
    const latencyMs = Math.round(performance.now() - start);
    return { id, name, endpoint, status: "ok", latencyMs, detail: `Online · ${latencyMs}ms` };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      id,
      name,
      endpoint,
      status: "down",
      latencyMs,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET() {
  const results = await Promise.all([
    check("binance-spot", "Binance Spot", "data-api.binance.vision", [
      "https://data-api.binance.vision/api/v3/ping",
    ]),
    check("binance-futures", "Binance Futures", "fapi.binance.com", [
      "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
      "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT",
    ]),
    check("coingecko", "CoinGecko", "api.coingecko.com", [
      "https://api.coingecko.com/api/v3/global",
    ]),
    check("fear-greed", "Fear & Greed", "api.alternative.me", [
      "https://api.alternative.me/fng/",
    ]),
  ]);

  return Response.json(
    { results, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
