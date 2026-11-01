import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const { session } = vi.hoisted(() => ({
  session: { user: null as { id: string; email: string } | null },
}));

vi.mock("@/lib/auth-server", () => ({
  getServerSession: () => ({ user: session.user }),
}));
vi.mock("next/headers", () => ({ headers: () => new Headers() }));

import { GET as getSync } from "@/app/api/sync/route";
import { POST as postDevice, DELETE as deleteDevice } from "@/app/api/devices/route";
import { GET as getMe } from "@/app/api/me/route";

let seq = 0;
async function makeUser() {
  seq += 1;
  const email = `mobile-${seq}@test.dev`;
  const user = await prisma.user.create({
    data: { name: email, email, emailVerified: true },
  });
  session.user = { id: user.id, email };
  return user;
}

describe("mobile API", () => {
  beforeEach(() => {
    session.user = null;
  });

  it("GET /sync returns serverTime and arrays", async () => {
    const user = await makeUser();
    const res = await getSync(new NextRequest("http://localhost/api/sync?since=2020-01-01T00:00:00.000Z"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.serverTime).toBeTruthy();
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(Array.isArray(body.wallets)).toBe(true);
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.budgets)).toBe(true);
    expect(Array.isArray(body.deletions)).toBe(true);
  });

  it("GET /me returns current user", async () => {
    const user = await makeUser();
    const res = await getMe(new NextRequest("http://localhost/api/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(user.id);
  });

  it("device register and unregister", async () => {
    await makeUser();
    const reg = await postDevice(
      new NextRequest("http://localhost/api/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: "android", token: "tok-1" }),
      })
    );
    expect(reg.status).toBe(201);

    const del = await deleteDevice(new NextRequest("http://localhost/api/devices?token=tok-1", { method: "DELETE" }));
    expect(del.status).toBe(200);

    const count = await prisma.deviceToken.count({ where: { token: "tok-1" } });
    expect(count).toBe(0);
  });

  it("returns 401 without session", async () => {
    const res = await getSync(new NextRequest("http://localhost/api/sync"));
    expect(res.status).toBe(401);
  });
});