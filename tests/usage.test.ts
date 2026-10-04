import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { periodKey } from "@/lib/usage";
import { applyWelcomeBonus, consume, getUsage, refund } from "@/lib/usage";
import { grantSubscription } from "@/lib/subscriptions";

async function makeUser(email: string) {
  return prisma.user.create({ data: { name: email, email, emailVerified: true } });
}

/** A throwaway plan with a tiny monthly limit so quota tests are deterministic. */
async function makeTinyPlan(key: string, limit: number) {
  const plan = await prisma.plan.create({
    data: {
      key,
      name: key,
      priceMonthly: 0,
      sortOrder: 99,
      entitlements: { create: [{ feature: "ocr.monthly_limit", value: limit }] },
    },
  });
  return plan;
}

describe("period key", () => {
  it("formats YYYY-MM in WIB", () => {
    // 2026-09-20 05:00 UTC == 2026-09-20 12:00 WIB (same month)
    expect(periodKey(new Date("2026-09-20T05:00:00.000Z"))).toBe("2026-09");
    // 2026-09-30 20:00 UTC == 2026-10-01 03:00 WIB (crosses month boundary)
    expect(periodKey(new Date("2026-09-30T20:00:00.000Z"))).toBe("2026-10");
  });
});

describe("OCR quota consumption (metrics feature 'ocr')", () => {
  it("consume is recorded against a lease snapshot and decreases remaining", async () => {
    const u = await makeUser("quota@test.dev");
    await grantSubscription(u.id, "STARTER", { days: 30 }); // 50 OCR/month

    const first = await consume(u.id, "ocr");
    expect(first.ok).toBe(true);
    expect(first.status.limit).toBe(50);
    expect(first.status.used).toBe(1);
    expect(first.status.remaining).toBe(49);

    const second = await consume(u.id, "ocr");
    expect(second.ok).toBe(true);
    expect(second.status.remaining).toBe(48);

    const usage = await getUsage(u.id, "ocr");
    expect(usage).toMatchObject({ used: 2, limit: 50, remaining: 48 });
  });

  it("blocks once the monthly limit is reached (never negative)", async () => {
    const u = await makeUser("overquota@test.dev");
    await makeTinyPlan("TINY1", 2);
    await grantSubscription(u.id, "TINY1", { days: 30 });

    expect((await consume(u.id, "ocr")).ok).toBe(true);
    expect((await consume(u.id, "ocr")).ok).toBe(true);
    const third = await consume(u.id, "ocr");
    expect(third.ok).toBe(false);
    expect(third.status.remaining).toBe(0);
    // Counter must never go negative.
    expect(third.status.used).toBe(2);
  });

  it("is race-safe: N parallel consumes never exceed the limit", async () => {
    const u = await makeUser("race@test.dev");
    await makeTinyPlan("TINY2", 1);
    await grantSubscription(u.id, "TINY2", { days: 30 });

    const results = await Promise.all([0, 1, 2, 3, 4].map(() => consume(u.id, "ocr")));
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(1);
    expect((await getUsage(u.id, "ocr")).used).toBe(1);
  });

  it("unlimited (limit null) always succeeds and records usage", async () => {
    const u = await makeUser("unlimited-usage@test.dev");
    await prisma.plan.create({
      data: {
        key: "UNL",
        name: "UNL",
        priceMonthly: 0,
        sortOrder: 98,
        entitlements: { create: [{ feature: "ocr.monthly_limit", value: Prisma.JsonNull }] },
      },
    });
    await grantSubscription(u.id, "UNL", { days: 30 });
    const r = await consume(u.id, "ocr");
    expect(r.ok).toBe(true);
    expect(await prisma.usageRecord.count({ where: { userId: u.id } })).toBe(1);
    expect((await getUsage(u.id, "ocr")).limit).toBe(null);
    expect((await getUsage(u.id, "ocr")).remaining).toBe(null);
  });

  it("refund restores the counter when an OCR call failed", async () => {
    const u = await makeUser("refund@test.dev");
    await makeTinyPlan("TINY3", 1);
    await grantSubscription(u.id, "TINY3", { days: 30 });

    const first = await consume(u.id, "ocr");
    expect(first.status.remaining).toBe(0);

    await refund(u.id, "ocr", first.refId!);
    expect((await getUsage(u.id, "ocr")).remaining).toBe(1);

    // Refunding the same refId twice must not double-credit.
    await refund(u.id, "ocr", first.refId!);
    expect((await getUsage(u.id, "ocr")).remaining).toBe(1);
  });
});

describe("welcome OCR bonus", () => {
  it("grants the one-time welcome bonus once only", async () => {
    const u = await makeUser("welcome@test.dev");
    const before = await getUsage(u.id, "ocr"); // FREE: limit 5 + bonus 0
    expect(before.bonus).toBe(0);
    expect(before.limit).toBe(5);

    await applyWelcomeBonus(u.id);
    const after = await getUsage(u.id, "ocr");
    expect(after.bonus).toBe(10);
    expect(after.remaining).toBe(15);

    // Second call is a no-op (guard by welcomeBonusClaimedAt).
    await applyWelcomeBonus(u.id);
    expect((await getUsage(u.id, "ocr")).bonus).toBe(10);
  });
});