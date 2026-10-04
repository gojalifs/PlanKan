import { prisma } from "@/lib/prisma";
import { getBaselineEntitlements, type FeatureValue } from "@/lib/plans-config";
import { currentPlan } from "@/lib/subscriptions";

/**
 * Entitlement/capability lookup (monetise.md §10, §12). No `if (plan === ...)`
 * in application code — read feature values from the DB (plan rows), falling
 * back to the FREE baseline and then the built-in table only when unseeded.
 */
export type { FeatureValue };

/** Entitlement value for a feature, or null when not configured. */
export async function getEntitlement(
  userId: string,
  feature: string
): Promise<FeatureValue> {
  const { planKey } = await currentPlan(userId);

  const rows = await prisma.planEntitlement.findMany({
    where: { plan: { key: { in: [planKey, "FREE"] } }, feature },
    include: { plan: { select: { key: true } } },
  });
  // Current plan wins; otherwise the FREE row; otherwise the seeded baseline.
  if (rows.length > 0) {
    const own = rows.find((r) => r.plan.key === planKey);
    const free = rows.find((r) => r.plan.key === "FREE");
    return (own ?? free)!.value as FeatureValue;
  }
  return getBaselineEntitlements(planKey)[feature] ?? null;
}

/** Numeric cap for a feature (null == unlimited). */
export async function getLimit(userId: string, feature: string): Promise<number | null> {
  const v = await getEntitlement(userId, feature);
  if (typeof v === "number") return v;
  return null;
}

/** Boolean feature gate (null/undefined → off). */
export async function canUse(userId: string, feature: string): Promise<boolean> {
  const v = await getEntitlement(userId, feature);
  return v === true; // explicit true only
}

/** All entitled features for the user's current plan (merged with FREE). */
export async function getEntitlements(userId: string): Promise<Record<string, FeatureValue>> {
  const { planKey } = await currentPlan(userId);

  const keys = [...new Set([planKey, "FREE"])];
  const rows = await prisma.planEntitlement.findMany({
    where: { plan: { key: { in: keys } } },
    include: { plan: { select: { key: true } } },
  });

  const merged: Record<string, FeatureValue> = {
    ...getBaselineEntitlements("FREE"),
    ...getBaselineEntitlements(planKey),
  };
  for (const r of rows) {
    // Current plan overrides FREE on feature-level conflict.
    if (r.plan.key === planKey || !(r.feature in merged)) {
      merged[r.feature] = r.value as FeatureValue;
    }
  }
  return merged;
}