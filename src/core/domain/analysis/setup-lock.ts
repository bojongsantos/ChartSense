import type { Timeframe } from "@/core/domain/models";

export interface SetupLockedSnapshot {
  symbol: string;
  timeframe: Timeframe;
  zoneType: "supply" | "demand";
  direction: "long" | "short";
  baseTime: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  confidence: number;
  zoneTop: number;
  zoneBottom: number;
  narrowness: number;
  strength: "fresh" | "tested" | "broken";
  touches: number;
  runningSince: number;
}

export interface SetupLockPort {
  load(symbol: string, timeframe: Timeframe): SetupLockedSnapshot | null;
  save(snapshot: SetupLockedSnapshot): void;
  clear(symbol: string, timeframe: Timeframe): void;
}
