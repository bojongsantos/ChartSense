"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Plan } from "@/core/domain/models";
import { hasFeature, type FeatureKey } from "@/core/domain/access/gating";
import { ADMIN_CHANGE_EVENT, getGateOverride, getPlan, isBrowser, loadAdminConfig, saveAdminConfig } from "@/infrastructure/persistence/admin-config-store";

interface PlanContextValue {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  canAccess: (feature: FeatureKey) => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const demoControls = process.env.NEXT_PUBLIC_ENABLE_DEMO_CONTROLS === "true";
  const [plan, setPlanState] = useState<Plan>("free");

  useEffect(() => {
    if (!isBrowser()) return;
    const sync = () => setPlanState(demoControls ? getPlan() : "free");
    sync();
    window.addEventListener(ADMIN_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ADMIN_CHANGE_EVENT, sync);
  }, [demoControls]);

  const setPlan = useCallback((next: Plan) => {
    if (!demoControls) return;
    setPlanState(next);
    if (!isBrowser()) return;
    // The Free/Pro toggle simulates the pure plan: clear any stale per-feature
    // overrides saved from admin testing so Pro fully unlocks (and Free fully
    // locks) every feature consistently.
    const cfg = loadAdminConfig();
    saveAdminConfig({ ...cfg, plan: next, gateOverrides: {} });
  }, [demoControls]);

  const canAccess = useCallback(
    (feature: FeatureKey) =>
      hasFeature(plan, feature, demoControls ? getGateOverride(feature) : undefined),
    [plan, demoControls],
  );

  const value = useMemo<PlanContextValue>(
    () => ({ plan, setPlan, canAccess }),
    [plan, setPlan, canAccess],
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
