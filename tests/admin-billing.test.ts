import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

process.env.MONITORING_OWNER_EMAIL = "owner@test.dev";

const { session } = vi.hoisted(() => ({
  session: { user: null as { id: string; email: string } | null },
}));
vi.mock("@/lib/auth-server", () => ({
  getServerSession: () => ({ user: session.user }),
}));

import { GET as listSubs, POST as grantSub } from "@/app/api/admin/subscriptions/route";
import { DELETE as deleteSub } from "@/app/api/admin/subscriptions/[id]/route";
import { currentPlanKey } from "@/lib/subscriptions";

async function jsonRequest(url: string, body?: unknown) {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function makeTargetUser(email: string) {
  return prisma.user.create({ data: { name: email, email, emailVerified: true } });
}

function asOwner() {
  session.user = { id: "admin-owner", email: "owner@test.dev" };
}
function asOther() {
  session.user = { id: "admin-other", email: "other@test.dev" };
}

beforeEach(() => {
  session.user = null;
});

describe("GET /api/admin/subscriptions", () => {
  it("denies non-owner access", async () => {
    asOther();
    const res = await listSubs();
    expect(res.status).toBe(401);
  });

  it("returns the subscription list for an owner", async () => {
    asOwner();
    const res = await listSubs();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.subscriptions)).toBe(true);
  });
});

describe("POST /api/admin/subscriptions (grant)", () => {
  it("denies non-owner access", async () => {
    asOther();
    const res = await grantSub(
      await jsonRequest("http://x/api/admin/subscriptions", { email: "x@test.dev", planKey: "STARTER" })
    );
    expect(res.status).toBe(401);
  });

  it("grants a paid plan for an existing user and it becomes their current plan", async () => {
    const target = await makeTargetUser("bill-b@test.dev");
    asOwner();

    const res = await grantSub(
      await jsonRequest("http://x/api/admin/subscriptions", {
        email: "bill-b@test.dev",
        planKey: "STARTER",
        months: 1,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.subscription.plan.key).toBe("STARTER");
    expect(body.subscription.status).toBe("ACTIVE");

    expect(await currentPlanKey(target.id)).toBe("STARTER");
  });

  it("rejects unknown users or unknown plans with 404", async () => {
    asOwner();
    const noUser = await grantSub(
      await jsonRequest("http://x/api/admin/subscriptions", { email: "nobody@test.dev", planKey: "STARTER" })
    );
    expect(noUser.status).toBe(404);

    const target = await makeTargetUser("bill-c@test.dev");
    const noPlan = await grantSub(
      await jsonRequest("http://x/api/admin/subscriptions", {
        email: target.email,
        planKey: "NOPE",
      })
    );
    expect(noPlan.status).toBe(404);
  });
});

describe("DELETE /api/admin/subscriptions/:id (cancel)", () => {
  it("cancels a subscription immediately, dropping the user back to FREE", async () => {
    const target = await makeTargetUser("bill-d@test.dev");
    asOwner();

    const created = await grantSub(
      await jsonRequest("http://x/api/admin/subscriptions", {
        email: "bill-d@test.dev",
        planKey: "PLUS",
        months: 1,
      })
    );
    const { subscription } = await created.json();
    expect(await currentPlanKey(target.id)).toBe("PLUS");

    const del = await deleteSub(new Request("http://x/api/admin/subscriptions/x"), {
      params: Promise.resolve({ id: subscription.id }),
    });
    expect(del.status).toBe(200);
    expect((await del.json()).status).toBe("CANCELLED");
    expect(await currentPlanKey(target.id)).toBe("FREE");
  });
});