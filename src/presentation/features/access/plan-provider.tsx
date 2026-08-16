"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Plan } from "@/core/domain/models";
import { hasFeature, type FeatureKey } from "@/core/domain/access/gating";

interface PlanContextValue {
  plan: Plan;
  canAccess: (feature: FeatureKey) => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Partial<Record<FeatureKey, boolean>>>({});

  useEffect(() => {
    const sync = () => {
      fetch("/api/entitlements", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data: { plan?: Plan; access?: Partial<Record<FeatureKey, boolean>> } | null) => {
          setPlanState(data?.plan ?? "free");
          setEntitlements(data?.access ?? {});
        })
        .catch(() => setPlanState("free"));
    };
    sync();
  }, []);

  const canAccess = useCallback(
    (feature: FeatureKey) =>
      hasFeature(plan, feature, entitlements[feature]),
    [plan, entitlements],
  );

  const value = useMemo<PlanContextValue>(
    () => ({ plan, canAccess }),
    [plan, canAccess],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return ctx;
}
