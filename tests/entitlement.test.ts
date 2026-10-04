import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { canUse, getLimit } from "@/lib/entitlement";
import { cancelSubscription, currentPlanKey, grantSubscription } from "@/lib/subscriptions";

async function makeUser(email: string) {
  return prisma.user.create({
    data: { name: email, email, emailVerified: true },
  });
}

describe("entitlement resolution", () => {
  it("defaults to FREE when user has no subscription", async () => {
    const u = await makeUser("free@test.dev");
    expect(await currentPlanKey(u.id)).toBe("FREE");
    expect(await getLimit(u.id, "ocr.monthly_limit")).toBe(5);
    expect(await canUse(u.id, "export.csv")).toBe(false);
  });

  it("uses the active subscription plan entitlements", async () => {
    const u = await makeUser("starter@test.dev");
    await grantSubscription(u.id, "STARTER", { days: 30 });
    expect(await currentPlanKey(u.id)).toBe("STARTER");
    expect(await getLimit(u.id, "ocr.monthly_limit")).toBe(50);
    expect(await canUse(u.id, "export.csv")).toBe(true);
  });

  it("unlimited limit is represented as null", async () => {
    const u = await makeUser("unlimited@test.dev");
    await grantSubscription(u.id, "PLUS", { days: 30 });
    expect(await getLimit(u.id, "budget.limit")).toBe(null);
    expect(await getLimit(u.id, "wallet.limit")).toBe(null);
  });

  it("falls back to FREE when the active subscription period ended", async () => {
    const u = await makeUser("expired@test.dev");
    const sub = await grantSubscription(u.id, "PLUS", { days: 30 });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { currentPeriodEnd: new Date(Date.now() - 1_000) },
    });
    expect(await currentPlanKey(u.id)).toBe("FREE");
    expect(await getLimit(u.id, "ocr.monthly_limit")).toBe(5);
  });

  it("falls back to FREE after cancellation", async () => {
    const u = await makeUser("cancelled@test.dev");
    const sub = await grantSubscription(u.id, "PRO", { days: 30 });
    await cancelSubscription(sub.id);
    expect(await currentPlanKey(u.id)).toBe("FREE");
    expect(await canUse(u.id, "export.csv")).toBe(false);
  });
});