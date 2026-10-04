import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { currentPlan } from "@/lib/subscriptions";
import { getEntitlements, type FeatureValue } from "@/lib/entitlement";
import { getUsage } from "@/lib/usage";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/me/usage
// Usage & entitlement snapshot for the signed-in user. Powers the header plan
// badge and quota progress bars without hammering the DB.
async function GETHandler() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [plan, entitlements, ocr, walletCount, budgetCount] = await Promise.all([
    currentPlan(session.user.id),
    getEntitlements(session.user.id),
    getUsage(session.user.id, "ocr"),
    prisma.wallet.count({ where: { userId: session.user.id } }),
    prisma.budget.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    plan: {
      key: plan.planKey,
      name: plan.plan?.name ?? "Free",
    },
    subscription: plan.subscription,
    entitlements: entitlements as Record<string, FeatureValue>,
    usage: {
      ocr,
      wallets: { used: walletCount, limit: Number(entitlements["wallet.limit"] ?? null) || null },
      budgets: { used: budgetCount, limit: Number(entitlements["budget.limit"] ?? null) || null },
    },
  });
}

export const GET = withMonitoring("me-usage", GETHandler);