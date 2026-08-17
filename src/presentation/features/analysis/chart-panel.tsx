"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPanePrimitive,
  type IPrimitivePaneView,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type LineWidth,
  type PaneAttachedParameter,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle, ChartData, PatternSummary, Timeframe, TradeLevel } from "@/core/domain/models";
import { formatPrice } from "@/shared/lib/format";
import { usePlan } from "@/presentation/features/access/plan-provider";

/**
 * Draws a single text label centered inside a zone box on the chart pane.
 * Attached at chart level so it is always rendered, with the text clamped so
 * it stays fully inside the zone (both horizontally and vertically).
 */
class ZoneLabelPrimitive implements IPanePrimitive<Time> {
  private _chart: IChartApi | null = null;
  private _priceSeries: ISeriesApi<"Candlestick"> | null = null;
  private _text: string;
  private _color: string;
  private _font = "600 11px Inter, system-ui, sans-serif";
  private _timeFrom: Time;
  private _timeTo: Time;
  private _priceTop: number;
  private _priceBottom: number;

  constructor(text: string, color: string, timeFrom: Time, timeTo: Time, priceTop: number, priceBottom: number) {
    this._text = text;
    this._color = color;
    this._timeFrom = timeFrom;
    this._timeTo = timeTo;
    this._priceTop = priceTop;
    this._priceBottom = priceBottom;
  }

  /** Called by the chart when attached. */
  attached(param: PaneAttachedParameter<Time>) {
    this._chart = param.chart as IChartApi;
    param.requestUpdate();
  }

  detached() {
    this._chart = null;
    this._priceSeries = null;
  }

  setPriceSeries(series: ISeriesApi<"Candlestick">) {
    this._priceSeries = series;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [
      {
        zOrder: () => "top" as const,
        renderer: () => ({
          draw: (target) => {
            target.useMediaCoordinateSpace(({ context }) => {
              const ts = this._chart?.timeScale();
              const idxFrom = ts?.timeToIndex(this._timeFrom, true);
              const idxTo = ts?.timeToIndex(this._timeTo, true);
              if (idxFrom === null || idxFrom === undefined || idxTo === null || idxTo === undefined) return;
              const xFrom = ts?.logicalToCoordinate(idxFrom as never);
              const xTo = ts?.logicalToCoordinate(idxTo as never);
              if (xFrom === null || xFrom === undefined || xTo === null || xTo === undefined) return;
              const yTop = this._priceSeries?.priceToCoordinate(this._priceTop);
              const yBottom = this._priceSeries?.priceToCoordinate(this._priceBottom);
              if (yTop === null || yTop === undefined || yBottom === null || yBottom === undefined) return;
              const left = Math.min(xFrom, xTo);
              const right = Math.max(xFrom, xTo);
              const top = Math.min(yTop, yBottom);
              const bottom = Math.max(yTop, yBottom);
              if (right - left < 4 || bottom - top < 4) return;

              context.font = this._font;
              context.textAlign = "center";
              context.textBaseline = "middle";
              const textW = context.measureText(this._text).width;
              const textH = 14;

              // Center inside the zone box, clamped so the text never pokes out.
              const cx = (left + right) / 2;
              const cy = (top + bottom) / 2;
              const x = Math.min(Math.max(cx, left + textW / 2 + 4), right - textW / 2 - 4);
              const y = Math.min(Math.max(cy, top + textH / 2 + 2), bottom - textH / 2 - 2);

              context.fillStyle = this._color;
              context.fillText(this._text, x, y);
            });
          },
        }),
      },
    ];
  }
}

interface ChartPanelProps {
  data: ChartData;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  symbol: string;
  precision: number;
  price: number;
  change24h: number;
  pattern: PatternSummary;
  levels: TradeLevel[];
  historyLoading: boolean;
  hasMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
}

const TIMEFRAMES: Timeframe[] = ["15m", "1H", "4H", "1D"];

/** Seconds per candle for each supported timeframe. */
const TF_SECONDS: Record<Timeframe, number> = {
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
};

/** How many future candles the setup zone extends. */
const ZONE_EXTEND_BARS = 12;

const upColor = "#089981";
const downColor = "#f23645";

export function ChartPanel({
  data,
  timeframe,
  onTimeframeChange,
  symbol,
  precision,
  price,
  change24h,
  pattern,
  levels,
  historyLoading,
  hasMoreHistory,
  onLoadMoreHistory,
}: ChartPanelProps) {
  const { canAccess } = usePlan();
  const showTradeLevels = canAccess("entryBreakdown");
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const liveCandlesRef = useRef<Candle[]>([]);
  const patternSeriesRef = useRef<ISeriesApi<"Line" | "Baseline">[]>([]);
  const zoneLabelPrimitiveRef = useRef<IPanePrimitive<Time> | null>(null);
  const patternMarkersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLineRef = useRef<IPriceLine[]>([]);
  const fittedKeyRef = useRef<string | null>(null);
  const pendingFitKeyRef = useRef<string | null>(null);
  const visibleRangeRef = useRef<{ from: number; to: number } | null>(null);
  const historyRequestArmedRef = useRef(true);
  const loadMoreHistoryRef = useRef(onLoadMoreHistory);
  const canLoadHistoryRef = useRef(hasMoreHistory && !historyLoading);

  useEffect(() => {
    loadMoreHistoryRef.current = onLoadMoreHistory;
    canLoadHistoryRef.current = hasMoreHistory && !historyLoading;
  }, [hasMoreHistory, historyLoading, onLoadMoreHistory]);

  const renderLive = useCallback((candles: Candle[]) => {
    const cs = candleSeriesRef.current;
    if (!cs) return;

    cs.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9a9aab",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.045)" },
      },
      rightPriceScale: {
        borderColor: "#2a2a3d",
        scaleMargins: { top: 0.08, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#2a2a3d",
        timeVisible: timeframe !== "1D",
        secondsVisible: false,
        rightOffset: 12,
        fixRightEdge: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      borderVisible: false,
      priceLineColor: "#4f7cff",
      priceLineStyle: 3,
      priceFormat: { type: "price", precision, minMove: 10 ** -precision },
    });
    candleSeriesRef.current = candles;

    patternMarkersRef.current = createSeriesMarkers(candles, []);

    chartRef.current = chart;

    const onVisibleRange = (range: { from: number; to: number } | null) => {
      if (!range) return;
      visibleRangeRef.current = { from: range.from, to: range.to };
      if (range.from > 20) historyRequestArmedRef.current = true;
      if (range.from < 5 && historyRequestArmedRef.current && canLoadHistoryRef.current) {
        historyRequestArmedRef.current = false;
        void loadMoreHistoryRef.current();
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRange);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRange);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      patternSeriesRef.current = [];
      patternMarkersRef.current = null;
      priceLineRef.current = [];
      visibleRangeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candles = candleSeriesRef.current;
    if (!chart || !candles) return;
    chart.timeScale().applyOptions({
      timeVisible: timeframe !== "1D",
      barSpacing: timeframe === "1D" ? 8 : 7,
      fixLeftEdge: !hasMoreHistory,
      fixRightEdge: false,
    });
    candles.applyOptions({ priceFormat: { type: "price", precision, minMove: 10 ** -precision } });
  }, [hasMoreHistory, precision, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const key = `${symbol}|${timeframe}`;
    const isNewView = key !== fittedKeyRef.current;

    // Keep the user's scroll position across live updates. Only re-fit when the
    // symbol or timeframe changes; otherwise restore the saved visible range —
    // or follow the newest bar when the user is already at the right edge.
    const savedRange = visibleRangeRef.current;
    const prevLen = liveCandlesRef.current.length;
    const previousFirstTime = liveCandlesRef.current[0]?.time;
    const prependedBars = previousFirstTime === undefined
      ? 0
      : Math.max(0, data.candles.findIndex((candle) => candle.time === previousFirstTime));

    liveCandlesRef.current = data.candles;
    renderLive(data.candles);

    if (isNewView) {
      // Defer viewport sizing to the zone effect (it runs after the candles
      // and knows how far the future-extended setup zone reaches). Just mark
      // this view as pending.
      pendingFitKeyRef.current = key;
      fittedKeyRef.current = key;

      // Center the price scale vertically on the recent price action so the
      // current price / entry zone is visible without scrolling up or down.
      const window = data.candles.slice(-40);
      if (window.length > 0) {
        let hi = -Infinity;
        let lo = Infinity;
        for (const c of window) {
          if (c.high > hi) hi = c.high;
          if (c.low < lo) lo = c.low;
        }
        const pad = (hi - lo) * 0.15 || hi * 0.01;
        chart.priceScale("right").setVisibleRange({ from: lo - pad, to: hi + pad });
      }
      return;
    }

    if (!savedRange) return;
    const atRightEdge = savedRange.to >= prevLen - 1 - 0.5;
    if (atRightEdge && data.candles.length > prevLen) {
      chart.timeScale().scrollToRealTime();
    } else {
      chart.timeScale().setVisibleLogicalRange({
        from: savedRange.from + prependedBars,
        to: savedRange.to + prependedBars,
      });
    }
  }, [data, renderLive, symbol, timeframe]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const s of patternSeriesRef.current) chart.removeSeries(s);
    patternSeriesRef.current = [];
    if (zoneLabelPrimitiveRef.current) {
      chart.panes()[0]?.detachPrimitive(zoneLabelPrimitiveRef.current);
      zoneLabelPrimitiveRef.current = null;
    }

    const zones = pattern.shape?.zones ?? [];
    const setup = pattern.shape?.setup;
    const markers: SeriesMarker<Time>[] = [];
    const isSetupZone = (z: { id: string }) => setup?.zoneId === z.id;

    // Only the setup (limit-order reference) zone is drawn — non-reference
    // zones are hidden so the chart stays focused on the actionable area.
    for (const zone of zones) {
      if (!isSetupZone(zone)) continue;
      const isDemand = zone.type === "demand";
      const color = isDemand ? "#22c55e" : "#f43f5e";

      // Broken zones: no fill, only a faint dashed outline.
      if (zone.strength === "broken") {
        markers.push({
          time: (data.candles.findIndex((c) => c.time === zone.baseTime) >= 0
            ? data.candles[Math.max(0, data.candles.findIndex((c) => c.time === zone.baseTime))].time
            : data.candles[0].time) as UTCTimestamp,
          position: "aboveBar",
          shape: "circle",
          color,
          size: 1,
          text: `${isDemand ? "DEMAND" : "SUPPLY"} BROKEN`,
        });
        continue;
      }

      const baseIdx = data.candles.findIndex((c) => c.time === zone.baseTime);
      const fromIdx = baseIdx >= 0 ? Math.max(0, baseIdx - 2) : 0;
      const fromTime = data.candles[fromIdx].time as UTCTimestamp;

      // Keep the setup zone close to live price so the chart does not reserve
      // a large, empty future area. One data point per bar (including future
      // bars) ensures the time scale owns the complete zone range.
      // time scale actually owns those bars and the band visibly stretches.
      const lastTime = data.candles[data.candles.length - 1].time;
      const toTime = (lastTime + TF_SECONDS[timeframe] * ZONE_EXTEND_BARS) as UTCTimestamp;
      if (toTime <= fromTime) continue;

      const barData: { time: UTCTimestamp; value: number }[] = [];
      for (let t = Number(fromTime); t <= Number(toTime); t += TF_SECONDS[timeframe]) {
        barData.push({ time: t as UTCTimestamp, value: zone.top });
      }
      const bottomData = barData.map((p) => ({ time: p.time, value: zone.bottom }));

      // Horizontal band between [zone.bottom, zone.top] using BaselineSeries:
      // the baseline sits at zone.bottom and the line data at zone.top, so the
      // fill is bounded by the PRICE range, not the chart height.
      const opacity = zone.strength === "fresh" ? "40" : "1f"; // 0.25 vs 0.12
      const band = chart.addSeries(BaselineSeries, {
        baseValue: { type: "price", price: zone.bottom },
        lineVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        topLineColor: color,
        topFillColor1: `${color}${opacity}`,
        topFillColor2: `${color}${opacity}`,
        bottomLineColor: "transparent",
        bottomFillColor1: "rgba(0,0,0,0)",
        bottomFillColor2: "rgba(0,0,0,0)",
      });
      band.setData(barData);
      patternSeriesRef.current.push(band);

      // Label text centered inside the zone box (both horizontally and
      // vertically), clamped so the full text stays inside the zone. Drawn via
      // a chart-level pane primitive so it renders on top and over the future.
      const label = new ZoneLabelPrimitive(
        `${isDemand ? "DEMAND" : "SUPPLY"} ${zone.strength.toUpperCase()}`,
        color,
        fromTime,
        toTime,
        zone.top,
        zone.bottom,
      );
      label.setPriceSeries(candleSeriesRef.current!);
      zoneLabelPrimitiveRef.current = label;
      chart.panes()[0]?.attachPrimitive(label);

      // Thin top/bottom edges so the zone boundary is visible.
      const topEdge = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      topEdge.setData(barData);
      patternSeriesRef.current.push(topEdge);

      const bottomEdge = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1 as LineWidth,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      bottomEdge.setData(bottomData);
      patternSeriesRef.current.push(bottomEdge);
    }

    patternMarkersRef.current?.setMarkers(markers);

    // After all series (including the future-extended setup zone) are drawn,
    // size the viewport once per symbol/timeframe so the extended zone is
    // actually visible on screen.
    if (pendingFitKeyRef.current) {
      pendingFitKeyRef.current = null;
      const lastIdx = data.candles.length - 1;
      const visibleLen = Math.round(chart.timeScale().width() / 7);
      const from = Math.max(0, lastIdx - Math.round(visibleLen * 0.82));
      chart.timeScale().setVisibleLogicalRange({ from, to: lastIdx + ZONE_EXTEND_BARS });
    }
  }, [data, pattern, timeframe]);

  useEffect(() => {
    const cs = candleSeriesRef.current;
    if (!cs) return;
    for (const pl of priceLineRef.current) cs.removePriceLine(pl);
    priceLineRef.current = [];
    if (!showTradeLevels) return;

    for (const level of levels) {
      const color = level.id === "sl" ? "#f43f5e" : level.id === "entry" ? "#4f7cff" : "#22c55e";
      priceLineRef.current.push(
        cs.createPriceLine({
          price: level.price,
          color,
          lineWidth: 1,
          lineStyle: level.id === "entry" ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.label,
        }),
      );
    }
  }, [levels, showTradeLevels]);

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold">{symbol}</span>
          <span className="text-sm font-semibold tabular-nums">
            ${formatPrice(price || (data.candles.at(-1)?.close ?? 0), precision)}
          </span>
          <span className={`text-xs font-semibold ${change24h >= 0 ? "text-positive" : "text-negative"}`}>
            {change24h >= 0 ? "+" : ""}
            {change24h.toFixed(2)}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-positive">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
            </span>
            Live
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                timeframe === tf ? "bg-accent/15 text-accent-2" : "text-muted-2 hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[420px] w-full">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="text-[10px] text-muted-2">
          {historyLoading
            ? "Memuat histori Binance…"
            : hasMoreHistory
              ? "Geser ke kiri untuk histori lebih lama"
              : "Awal histori Binance tercapai"}
        </span>
        <span className="hidden text-[10px] text-muted-2 sm:block">
          TradingView Lightweight Charts · {data.candles.length} bars · kanan: area proyeksi
        </span>
      </div>
    </div>
  );
}
