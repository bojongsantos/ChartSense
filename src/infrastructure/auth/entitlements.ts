import "server-only";

import type { CurrentUserDto } from "@/core/domain/identity";
import { hasFeature, type FeatureKey } from "@/core/domain/access/gating";
import { prisma } from "@/infrastructure/database/prisma";

export async function canUserAccessFeature(user: CurrentUserDto | null, feature: FeatureKey): Promise<boolean> {
  const plan = user?.plan === "PREMIUM" ? "premium" : "free";
  if (!user) return hasFeature(plan, feature);
  const [grant, gate] = await Promise.all([
    prisma.userFeatureGrant.findUnique({ where: { userId_feature: { userId: user.id, feature } }, select: { enabled: true } }),
    prisma.featureGate.findUnique({ where: { feature }, select: { free: true, premium: true } }),
  ]);
  return grant?.enabled ?? (gate ? (plan === "premium" ? gate.premium : gate.free) : hasFeature(plan, feature));
}
