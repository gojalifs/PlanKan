import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { currentPlanKey, grantSubscription } from "@/lib/subscriptions";

async function makeUser(email: string) {
  return prisma.user.create({ data: { name: email, email, emailVerified: true } });
}

describe("subscription lifecycle", () => {
  it("grant subscribes a user to a plan", async () => {
    const u = await makeUser("grant@test.dev");
    const sub = await grantSubscription(u.id, "STARTER", { days: 30 });
    expect(sub.plan.key).toBe("STARTER");
    expect(sub.status).toBe("ACTIVE");
    expect(await currentPlanKey(u.id)).toBe("STARTER");
  });

  it("regranting a higher plan keeps history and cancels the old one", async () => {
    const u = await makeUser("upgrade@test.dev");
    const first = await grantSubscription(u.id, "STARTER", { days: 30 });
    const second = await grantSubscription(u.id, "PLUS", { days: 30 });

    const all = await prisma.subscription.findMany({ where: { userId: u.id }, orderBy: { createdAt: "asc" } });
    expect(all).toHaveLength(2); // history preserved — never deleted
    expect(all[0].id).toBe(first.id);
    expect(all[0].status).toBe("CANCELLED");
    expect(all[1].id).toBe(second.id);
    expect(all[1].status).toBe("ACTIVE");
    expect(await currentPlanKey(u.id)).toBe("PLUS");
  });

  it("a canceled subscription is not counted as active", async () => {
    const u = await makeUser("cancel-history@test.dev");
    const sub = await grantSubscription(u.id, "STARTER", { days: 30 });
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
    expect(await currentPlanKey(u.id)).toBe("FREE");
  });
});