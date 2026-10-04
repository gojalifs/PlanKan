import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────
const { session } = vi.hoisted(() => ({
  session: { user: null as { id: string; email: string } | null },
}));

vi.mock("@/lib/auth-server", () => ({
  getServerSession: () => ({ user: session.user }),
}));
vi.mock("next/headers", () => ({ headers: () => new Headers() }));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: () => ({ user: session.user }) } },
}));

import { GET, POST } from "@/app/api/goals/route";
import { PUT, DELETE } from "@/app/api/goals/[id]/route";
import { grantSubscription } from "@/lib/subscriptions";

let seq = 0;
async function makeTestUser(): Promise<string> {
  seq += 1;
  const email = `goals-${seq}@test.dev`;
  const user = await prisma.user.create({
    data: { name: email, email, emailVerified: true },
  });
  session.user = { id: user.id, email };
  return user.id;
}

async function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  session.user = null;
  vi.clearAllMocks();
});

describe("goals API — ai.financial_goals entitlement", () => {
  it("Free users get 403 FINANCIAL_GOALS_REQUIRED on create", async () => {
    await makeTestUser();
    const res = await POST(await jsonRequest("http://x/api/goals", "POST", { name: "Dana Darurat", targetAmount: 10_000_000 }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FINANCIAL_GOALS_REQUIRED");
  });

  it("Starter users are also blocked", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "STARTER", { days: 30 });
    const res = await POST(await jsonRequest("http://x/api/goals", "POST", { name: "Liburan", targetAmount: 5_000_000 }));
    expect(res.status).toBe(403);
  });

  it("Plus users can create a goal and it starts ACTIVE", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const res = await POST(
      await jsonRequest("http://x/api/goals", "POST", {
        name: "MacBook",
        targetAmount: 25_000_000,
        currentAmount: 3_000_000,
        targetDate: "2027-12-31",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.goal.name).toBe("MacBook");
    expect(body.goal.status).toBe("ACTIVE");
    expect(body.goal.targetAmount).toBe(25_000_000);
    expect(body.goal.currentAmount).toBe(3_000_000);
  });

  it("a goal funded past the target is created COMPLETED", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const res = await POST(
      await jsonRequest("http://x/api/goals", "POST", {
        name: "Infaq",
        targetAmount: 100_000,
        currentAmount: 150_000,
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.goal.status).toBe("COMPLETED");
    expect(body.goal.completedAt).not.toBeNull();
  });

  it("rejects a wallet that does not belong to the user", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const other = await prisma.user.create({
      data: { name: "other@test.dev", email: "other@test.dev", emailVerified: true },
    });
    const otherWallet = await prisma.wallet.create({
      data: { userId: other.id, name: "Dompet Orang Lain", type: "CASH" },
    });
    const res = await POST(
      await jsonRequest("http://x/api/goals", "POST", {
        name: "Salah Dompet",
        targetAmount: 1_000_000,
        walletId: otherWallet.id,
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("goals API — update & delete", () => {
  it("updating an amount past the target auto-completes the goal", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const created = await POST(
      await jsonRequest("http://x/api/goals", "POST", { name: "Haji", targetAmount: 50_000_000 })
    );
    const goalId = (await created.json()).goal.id;

    const res = await PUT(
      await jsonRequest(`http://x/api/goals/${goalId}`, "PUT", { currentAmount: 50_000_000 }),
      { params: Promise.resolve({ id: goalId }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goal.status).toBe("COMPLETED");
    expect(body.goal.completedAt).not.toBeNull();
  });

  it("cannot update or delete another user's goal", async () => {
    const owner = await makeTestUser();
    await grantSubscription(owner, "PLUS", { days: 30 });
    const created = await POST(
      await jsonRequest("http://x/api/goals", "POST", { name: "Mobil", targetAmount: 200_000_000 })
    );
    const goalId = (await created.json()).goal.id;

    const intruder = await makeTestUser();
    await grantSubscription(intruder, "PLUS", { days: 30 });

    const putRes = await PUT(
      await jsonRequest(`http://x/api/goals/${goalId}`, "PUT", { currentAmount: 1 }),
      { params: Promise.resolve({ id: goalId }) }
    );
    expect(putRes.status).toBe(404);

    const delRes = await DELETE(new NextRequest("http://x/api/goals"), {
      params: Promise.resolve({ id: goalId }),
    });
    expect(delRes.status).toBe(404);
  });

  it("deletes the user's own goal", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const created = await POST(
      await jsonRequest("http://x/api/goals", "POST", { name: "Hapus", targetAmount: 10_000 })
    );
    const goalId = (await created.json()).goal.id;

    const res = await DELETE(new NextRequest("http://x/api/goals"), {
      params: Promise.resolve({ id: goalId }),
    });
    expect(res.status).toBe(200);
    expect(await prisma.financialGoal.findUnique({ where: { id: goalId } })).toBeNull();
  });
});

describe("goals API — list & summary", () => {
  it("returns goals with progress and a summary", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    await POST(
      await jsonRequest("http://x/api/goals", "POST", {
        name: "Darurat",
        targetAmount: 10_000_000,
        currentAmount: 4_000_000,
      })
    );
    await POST(
      await jsonRequest("http://x/api/goals", "POST", {
        name: "Lunas",
        targetAmount: 5_000_000,
        currentAmount: 5_000_000,
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.goals).toHaveLength(2);
    expect(body.goals.find((g: { name: string }) => g.name === "Darurat").percent).toBe(40);
    expect(body.goals.find((g: { name: string }) => g.name === "Darurat").remaining).toBe(6_000_000);
    expect(body.summary).toMatchObject({ totalTarget: 15_000_000, totalSaved: 9_000_000, activeCount: 1 });
  });
});