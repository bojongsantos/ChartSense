"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Plan } from "@/lib/types";
import { hasFeature, type FeatureKey } from "@/lib/gating";
import { ADMIN_CHANGE_EVENT, getPlan, isBrowser, loadAdminConfig, saveAdminConfig } from "@/lib/admin";

interface PlanContextValue {
  plan: Plan;
  isPro: boolean;
  setPlan: (plan: Plan) => void;
  togglePlan: () => void;
  canAccess: (feature: FeatureKey) => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<Plan>("free");

  useEffect(() => {
    if (!isBrowser()) return;
    const sync = () => setPlanState(getPlan());
    sync();
    window.addEventListener(ADMIN_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ADMIN_CHANGE_EVENT, sync);
  }, []);

  const setPlan = useCallback((next: Plan) => {
    setPlanState(next);
    if (!isBrowser()) return;
    // The Free/Pro toggle simulates the pure plan: clear any stale per-feature
    // overrides saved from admin testing so Pro fully unlocks (and Free fully
    // locks) every feature consistently.
    const cfg = loadAdminConfig();
    saveAdminConfig({ ...cfg, plan: next, gateOverrides: {} });
  }, []);

  const togglePlan = useCallback(() => {
    const next = plan === "free" ? "pro" : "free";
    setPlan(next);
  }, [plan, setPlan]);

  const canAccess = useCallback((feature: FeatureKey) => hasFeature(plan, feature), [plan]);

  const value = useMemo<PlanContextValue>(
    () => ({ plan, isPro: plan === "pro", setPlan, togglePlan, canAccess }),
    [plan, setPlan, togglePlan, canAccess],
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
