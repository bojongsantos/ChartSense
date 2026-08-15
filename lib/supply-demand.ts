import type { Candle, SetupDirection } from "./types";
import { formatPrice } from "./format";
import {
  clearSetupSnapshot,
  loadSetupSnapshot,
  saveSetupSnapshot,
  type SetupLockedSnapshot,
} from "./setup-store";

export type ZoneType = "supply" | "demand";
export type ZoneStrength = "fresh" | "tested" | "broken";

export interface SdZone {
  id: string;
  type: ZoneType;
  top: number;
  bottom: number;
  /** Candle index where the zone's base starts. */
  baseIndex: number;
  baseTime: number;
  /** How many times price has revisited the zone. */
  touches: number;
  strength: ZoneStrength;
  /** Whether price currently sits inside the zone. */
  active: boolean;
  /** Confidence 0..100 — fresh + narrow + unbroken zones score higher. */
  confidence: number;
  /** Zone width relative to the average range (0 = wide, 1 = razor thin). */
  narrowness: number;
}

export interface SdSetup {
  direction: SetupDirection;
  zone: SdZone;
  entry: number;
  target1: number;
  target2: number;
  stopLoss: number;
  riskReward: number;
  confidence: number;
  status: string;
  reasoning: string[];
  /** Values frozen the first time the setup turned Running. Null until then. */
  lockedSnapshot: SetupLockedSnapshot | null;
  /** Timestamp (ms) when the setup first entered Running. Null until then. */
  runningSince: number | null;
}

export interface SdResult {
  zones: SdZone[];
  setup: SdSetup | null;
  bias: "bullish" | "bearish" | "neutral";
  support: number;
  resistance: number;
}

export type SetupStatus =
  | "Limit Order"
  | "Filled"
  | "Running"
  | "Target 2 reached"
  | "Invalidated (SL hit)"
  | "Missed";

/** Statuses that are still actionable and belong in the scanner table. */
export const ACTIVE_SETUP_STATUSES: SetupStatus[] = ["Limit Order", "Filled", "Running"];
export const TERMINAL_SETUP_STATUSES: SetupStatus[] = [
  "Target 2 reached",
  "Invalidated (SL hit)",
  "Missed",
];

/**
 * Supply & Demand detection.
 *
 * A zone is the *base* — a short consolidation before a sharp expansion
 * (impulse) candle. The base's high/low bounds the zone. Price returning into
 * an untouched (fresh) zone marks a high-quality entry; tested zones weaken,
 * broken zones are discarded.
 *
 * A setup moves through a state machine:
 *   Limit Order -> Filled -> Running -> (Target 2 reached | Invalidated)
 *   Limit Order -> Missed (price ran through T1 without ever filling entry)
 * Once a setup first turns "Running" its levels are frozen in localStorage and
 * every later scan reuses those exact numbers until the setup goes terminal.
 */
export function detectSupplyDemand(candles: Candle[], symbol?: string): SdResult {
  const zones: SdZone[] = [];

  // Average candle range used to detect an "impulse" (expansion) candle.
  const avgRange =
    candles.slice(-40).reduce((s, c) => s + (c.high - c.low), 0) / Math.max(1, Math.min(40, candles.length));
  const impulseFactor = 1.6;

  for (let i = 2; i < candles.length - 1; i++) {
    const baseStart = i - 2; // up to 2 candles of base before the impulse
    const impulse = candles[i];
    const impulseRange = impulse.high - impulse.low;
    const isExpansion = impulseRange > avgRange * impulseFactor;

    // A sharp downward expansion breaks the prior base low → supply above.
    const isSupplyImpulse =
      isExpansion &&
      impulse.close < impulse.open &&
      impulse.close < candles[i - 1].low &&
      impulse.high < candles[baseStart].high * 1.02;
    // A sharp upward expansion breaks the prior base high → demand below.
    const isDemandImpulse =
      isExpansion &&
      impulse.close > impulse.open &&
      impulse.close > candles[i - 1].high &&
      impulse.low > candles[baseStart].low * 0.98;

    if (!isSupplyImpulse && !isDemandImpulse) continue;

    // The zone is the base range (before the impulse), padded slightly.
    let baseHigh = candles[baseStart].high;
    let baseLow = candles[baseStart].low;
    for (let k = baseStart + 1; k < i; k++) {
      baseHigh = Math.max(baseHigh, candles[k].high);
      baseLow = Math.min(baseLow, candles[k].low);
    }
    const pad = (baseHigh - baseLow) * 0.15;
    const top = baseHigh + pad;
    const bottom = baseLow - pad;

    // Skip if the base is not meaningfully below (supply) / above (demand)
    // the impulse's opposite edge — a real zone sits off the current price.
    if (isSupplyImpulse && impulse.low > top * 1.01) continue;
    if (isDemandImpulse && impulse.high < bottom * 0.99) continue;

    // Skip zones overlapping an existing zone of the same type.
    const overlaps = zones.some(
      (z) => z.type === (isSupplyImpulse ? "supply" : "demand") && z.top >= bottom && z.bottom <= top,
    );
    if (overlaps) continue;

    // Count touches after the impulse and classify strength.
    let touches = 0;
    let broken = false;
    const current = candles[candles.length - 1];
    for (let j = i + 1; j < candles.length; j++) {
      const c = candles[j];
      if (isSupplyImpulse) {
        if (c.low <= top && c.high >= bottom) touches++;
      } else {
        if (c.high >= bottom && c.low <= top) touches++;
      }
    }
    // Broken: price closed through the zone and never came back.
    if (isSupplyImpulse && current.close > top) broken = true;
    if (isDemandImpulse && current.close < bottom) broken = true;

    const strength: ZoneStrength = broken ? "broken" : touches === 0 ? "fresh" : "tested";
    const active = isSupplyImpulse
      ? current.close <= top && current.close >= bottom * 0.97
      : current.close >= bottom && current.close <= top * 1.03;
    const narrowness = Math.max(0, 1 - (top - bottom) / (avgRange * 3));
    const confidence = Math.round(
      Math.min(96, Math.max(20, 42 + narrowness * 26 + (strength === "fresh" ? 22 : strength === "tested" ? 8 : 0) - touches * 5)),
    );

    zones.push({
      id: `${isSupplyImpulse ? "supply" : "demand"}-${i}`,
      type: isSupplyImpulse ? "supply" : "demand",
      top,
      bottom,
      baseIndex: baseStart,
      baseTime: candles[baseStart].time,
      touches,
      strength,
      active,
      confidence,
      narrowness,
    });
  }

  // Bias from nearest support/demand and resistance/supply around current price.
  const last = candles[candles.length - 1];
  const price = last.close;
  const demandZones = zones.filter((z) => z.type === "demand");
  const supplyZones = zones.filter((z) => z.type === "supply");
  const nearestDemand = demandZones.filter((z) => z.bottom <= price).sort((a, b) => b.bottom - a.bottom)[0];
  const nearestSupply = supplyZones.filter((z) => z.top >= price).sort((a, b) => a.top - b.top)[0];
  const support = nearestDemand?.bottom ?? price * 0.97;
  const resistance = nearestSupply?.top ?? price * 1.03;
  const bias =
    price - support > resistance - price ? "bullish" : price - support < resistance - price ? "bearish" : "neutral";

  // Locked setups (already Running) take priority: reuse the frozen numbers,
  // never recompute the zone, and only update the terminal flags.
  if (symbol) {
    const locked = loadSetupSnapshot(symbol);
    if (locked) {
      const isLong = locked.direction === "long";
      // Terminal checks use current price against the locked levels.
      if (isLong ? price <= locked.stopLoss : price >= locked.stopLoss) {
        clearSetupSnapshot(symbol);
      } else if (isLong ? price >= locked.target2 : price <= locked.target2) {
        clearSetupSnapshot(symbol);
      } else {
        const zone: SdZone = {
          id: `${locked.zoneType}-locked`,
          type: locked.zoneType,
          top: locked.zoneTop,
          bottom: locked.zoneBottom,
          baseIndex: -1,
          baseTime: locked.baseTime,
          touches: locked.touches ?? 1,
          strength: locked.strength ?? "tested",
          active: true,
          confidence: locked.confidence,
          narrowness: locked.narrowness ?? 0,
        };
        const risk = Math.abs(locked.entry - locked.stopLoss);
        const riskReward = Math.min(9, Math.max(0.3, Math.abs(locked.target2 - locked.entry) / Math.max(1e-9, risk)));
        const setup: SdSetup = {
          direction: locked.direction,
          zone,
          entry: locked.entry,
          target1: locked.target1,
          target2: locked.target2,
          stopLoss: locked.stopLoss,
          riskReward: Number(riskReward.toFixed(2)),
          confidence: locked.confidence,
          status: "Running",
          reasoning: [
            `Setup ${locked.direction === "long" ? "demand" : "supply"} terkunci dan berjalan sejak ${new Date(locked.runningSince).toLocaleString()}, dengan level yang dibekukan pada entry ${formatPrice(locked.entry)}.`,
            `Target berada di ${formatPrice(locked.target1)} dengan rasio 1:1 dan ${formatPrice(locked.target2)} dengan rasio 1:2, sedangkan invalidation ada di ${formatPrice(locked.stopLoss)}.`,
          ],
          lockedSnapshot: locked,
          runningSince: locked.runningSince,
        };
        return { zones, setup, bias, support, resistance };
      }
    }
  }

  // Best actionable setup: nearest fresh/active zone. Skip zones that already
  // ran (TP hit / SL hit / entry never reached) so the plan rolls over to the
  // next best live zone instead of re-serving a finished one.
  const candidates = zones
    .filter((z) => z.strength !== "broken" && z.active)
    .sort((a, b) => b.confidence - a.confidence);

  let setup: SdSetup | null = null;
  for (const zone of candidates) {
    const isLong = zone.type === "demand";
    const entry = isLong ? zone.top : zone.bottom;
    const stopLoss = isLong ? zone.bottom * 0.985 : zone.top * 1.015;
    // Target 1 = RR 1:1, Target 2 = RR 1:2 (measured from the same risk unit).
    const risk = Math.abs(entry - stopLoss);
    const target1 = isLong ? entry + risk * 1 : entry - risk * 1;
    const target2 = isLong ? entry + risk * 2 : entry - risk * 2;

    const status = computeSetupStatus(candles, zone, isLong, entry, stopLoss, target1, target2, price);
    if (TERMINAL_SETUP_STATUSES.includes(status as SetupStatus)) {
      continue;
    }

    // First transition to Running freezes the levels for every future scan.
    let lockedSnapshot: SetupLockedSnapshot | null = null;
    let runningSince: number | null = null;
    if (status === "Running" && symbol) {
      runningSince = Date.now();
      lockedSnapshot = {
        symbol,
        zoneType: zone.type,
        direction: isLong ? "long" : "short",
        baseTime: zone.baseTime,
        entry,
        stopLoss,
        target1,
        target2,
        confidence: zone.confidence,
        zoneTop: zone.top,
        zoneBottom: zone.bottom,
        narrowness: zone.narrowness,
        strength: zone.strength,
        touches: zone.touches,
        runningSince,
      };
      saveSetupSnapshot(lockedSnapshot);
    }

    const rawRr = Math.abs(target2 - entry) / Math.max(1e-9, Math.abs(entry - stopLoss));
    const riskReward = Math.min(9, Math.max(0.3, rawRr));

    setup = {
      direction: isLong ? "long" : "short",
      zone,
      entry,
      target1,
      target2,
      stopLoss,
      riskReward: Number(riskReward.toFixed(2)),
      confidence: zone.confidence,
      status,
      reasoning: [
        `Zona ${zone.type === "demand" ? "demand" : "supply"} yang ${zone.strength === "fresh" ? "baru" : zone.strength === "tested" ? "teruji" : "rusak"} berada di rentang ${formatPrice(zone.bottom)} hingga ${formatPrice(zone.top)} dengan ${zone.touches} sentuhan.`,
        `Harga saat ini ${zone.active ? "berada di dalam" : "mendekati"} zona, sehingga ${isLong ? "beli" : "jual"} dilakukan di ${isLong ? "atas zona" : "bawah zona"} pada harga ${formatPrice(entry)}.`,
        `Target pertama di ${formatPrice(target1)} dengan rasio 1:1 dan target kedua di ${formatPrice(target2)} dengan rasio 1:2, sedangkan invalidation berada di ${formatPrice(stopLoss)}.`,
      ],
      lockedSnapshot,
      runningSince,
    };
    break;
  }

  return { zones, setup, bias, support, resistance };
}

/**
 * State machine that decides a setup's status from actual price history.
 *
 * - Limit Order: entry never touched since the zone formed.
 * - Filled: entry touched, price still at/behind the entry (no confirmation).
 * - Running: entry touched and price moved past entry toward the targets.
 * - Target 2 reached / Invalidated (SL hit): terminal outcomes.
 * - Missed: entry never touched but price already ran through target 1.
 */
export function computeSetupStatus(
  candles: Candle[],
  zone: SdZone,
  isLong: boolean,
  entry: number,
  stopLoss: number,
  target1: number,
  target2: number,
  price: number,
): SetupStatus {
  // Walk candles after the zone formed and track whether entry was ever filled
  // before any target/SL could be "reached".
  let entryFilled = false;
  let slHit = false;
  let t2Hit = false;
  // If entry never filled but price still ran through target 1 at any point,
  // the setup is cancelled and replaced with a new one.
  let ranToT1 = false;
  // Walk candles AFTER the impulse (zone formation) only: the base candles
  // themselves sit below/above the entry and must not count as "filled".
  for (let i = Math.min(candles.length - 1, zone.baseIndex + 3); i < candles.length; i++) {
    const c = candles[i];
    if (isLong) {
      if (c.low <= entry) entryFilled = true;
      if (entryFilled && c.low <= stopLoss) slHit = true;
      if (entryFilled && c.high >= target2) t2Hit = true;
      if (!entryFilled && c.high > target1) ranToT1 = true;
    } else {
      if (c.high >= entry) entryFilled = true;
      if (entryFilled && c.high >= stopLoss) slHit = true;
      if (entryFilled && c.low <= target2) t2Hit = true;
      if (!entryFilled && c.low < target1) ranToT1 = true;
    }
  }

  if (!entryFilled) {
    // Entry never touched. If price already ran through target 1 at any candle,
    // the opportunity is gone (Missed). Otherwise it is still a live limit.
    if (ranToT1) return "Missed";
    return "Limit Order";
  }
  if (slHit) return "Invalidated (SL hit)";
  if (t2Hit) return "Target 2 reached";
  // Entry filled: Filled until price confirms direction past the entry.
  const moved = isLong ? price > entry : price < entry;
  if (!moved) return "Filled";
  return "Running";
}

/** Build a single-lookback quick scan result for the scanner. */
export function scanSd(candles: Candle[]): SdResult {
  return detectSupplyDemand(candles);
}
