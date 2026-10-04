import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────
// `session` is a mutable holder so each test can impersonate its own user.
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
vi.mock("@/lib/receipt-ocr", () => ({
  hasGeminiKey: () => true,
  getReceiptItems: async () => ({
    items: [],
    source: "gemini" as const,
    transactionDate: "",
    transactionDateConfidence: null,
  }),
}));
vi.mock("@/lib/voice-parse", () => ({
  parseVoiceTranscript: vi.fn(async () => ({
    draft: { type: "EXPENSE", amount: 50000, note: "test" },
  })),
}));
vi.mock("@/lib/ai-review", () => ({
  generateMonthlyReviewText: vi.fn(async () => ({
    summary: "AI monthly summary",
    suggestions: ["saran AI"],
    source: "gemini" as const,
  })),
}));

import { POST as postReceipt } from "@/app/api/receipts/route";
import { POST as postVoice } from "@/app/api/voice/route";
import { GET as getMonthlyReview } from "@/app/api/monthly-review/route";
import { POST as postWallet } from "@/app/api/wallets/route";
import { POST as postBudget } from "@/app/api/budgets/route";
import { grantSubscription } from "@/lib/subscriptions";
import { consume } from "@/lib/usage";
import { getUsage } from "@/lib/usage";
import { parseVoiceTranscript } from "@/lib/voice-parse";
import { generateMonthlyReviewText } from "@/lib/ai-review";

let seq = 0;
async function makeTestUser(): Promise<string> {
  seq += 1;
  const email = `enforce-${seq}@test.dev`;
  const user = await prisma.user.create({
    data: { name: email, email, emailVerified: true },
  });
  session.user = { id: user.id, email };
  return user.id;
}

/** Plan with a chosen entitlement value + welcome bonus disabled (deterministic). */
async function makeLimitPlan(key: string, feature: string, value: number) {
  await prisma.plan.create({
    data: {
      key,
      name: key,
      priceMonthly: 0,
      sortOrder: 99,
      entitlements: {
        create: [
          { feature, value },
          { feature: "ocr.welcome_bonus", value: 0 },
        ],
      },
    },
  });
}

async function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function pngRequest(url: string) {
  const fd = new FormData();
  fd.append("image", new File([new Uint8Array([1, 2, 3, 4])], "receipt.png", { type: "image/png" }));
  return new Request(url, { method: "POST", body: fd });
}

beforeEach(() => {
  session.user = null;
  vi.clearAllMocks();
});

describe("receipts API — OCR quota enforcement", () => {
  it("consumes one shared-ocr credit per successful upload", async () => {
    const id = await makeTestUser();
    const res = await postReceipt(await pngRequest("http://x/api/receipts"));
    expect(res.status).toBe(201);
    expect((await getUsage(id, "ocr")).used).toBe(1);
  });

  it("returns 429 OCR_QUOTA_EXCEEDED when the shared quota is exhausted", async () => {
    const id = await makeTestUser();
    await makeLimitPlan("EF_TINY", "ocr.monthly_limit", 1);
    await grantSubscription(id, "EF_TINY", { days: 30 });
    await consume(id, "ocr"); // use the single credit

    const res = await postReceipt(await pngRequest("http://x/api/receipts"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("OCR_QUOTA_EXCEEDED");
    expect(body.usage).toMatchObject({ remaining: 0, used: 1 });
  });
});

describe("voice API — shares the OCR pool", () => {
  it("consumes the shared pool on a successful parse", async () => {
    const id = await makeTestUser();
    const res = await postVoice(await jsonRequest("http://x/api/voice", { text: "beli bensin 50 ribu" }));
    expect(res.status).toBe(200);
    expect((await getUsage(id, "ocr")).used).toBe(1);
  });

  it("returns 429 when the shared quota is exhausted", async () => {
    const id = await makeTestUser();
    await makeLimitPlan("EF_VOICE", "ocr.monthly_limit", 2);
    await grantSubscription(id, "EF_VOICE", { days: 30 });
    expect((await consume(id, "ocr")).ok).toBe(true);
    expect((await consume(id, "ocr")).ok).toBe(true);

    const res = await postVoice(await jsonRequest("http://x/api/voice", { text: "beli kopi 10 ribu" }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("OCR_QUOTA_EXCEEDED");
  });

  it("refunds the credit when the AI call fails", async () => {
    const id = await makeTestUser();
    vi.mocked(parseVoiceTranscript).mockRejectedValueOnce(new Error("Gemini down"));
    const res = await postVoice(await jsonRequest("http://x/api/voice", { text: "beli nasi 20 ribu" }));
    expect(res.status).toBe(502);
    expect((await getUsage(id, "ocr")).used).toBe(0);
  });
});

describe("monthly review — AI text is gated by entitlement", () => {
  it("Free users get deterministic fallback, never an AI call", async () => {
    await makeTestUser();
    const res = await getMonthlyReview(
      new NextRequest("http://x/api/monthly-review?month=1&year=2026")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("fallback");
    expect(body.summary).toBe(null);
    expect(generateMonthlyReviewText).not.toHaveBeenCalled();
  });

  it("Plus users get the AI-generated summary", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const res = await getMonthlyReview(
      new NextRequest("http://x/api/monthly-review?month=2&year=2026")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("gemini");
    expect(body.summary).toBe("AI monthly summary");
  });
});

describe("wallets API — wallet.limit enforced server-side", () => {
  it("rejects creation beyond the plan wallet limit", async () => {
    const id = await makeTestUser();
    await makeLimitPlan("EF_WALLET", "wallet.limit", 1);
    await grantSubscription(id, "EF_WALLET", { days: 30 });

    const ok = await postWallet(await jsonRequest("http://x/api/wallets", { name: "Kantong 1", type: "CASH" }));
    expect(ok.status).toBe(201);

    const blocked = await postWallet(await jsonRequest("http://x/api/wallets", { name: "Kantong 2", type: "CASH" }));
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).code).toBe("WALLET_LIMIT_REACHED");
  });

  it("allows unlimited wallets on unlimited plans", async () => {
    const id = await makeTestUser();
    await grantSubscription(id, "PLUS", { days: 30 });
    const a = await postWallet(await jsonRequest("http://x/api/wallets", { name: "A", type: "CASH" }));
    const b = await postWallet(await jsonRequest("http://x/api/wallets", { name: "B", type: "CASH" }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });
});

describe("budgets API — budget.limit enforced server-side", () => {
  it("rejects budget creation beyond the plan limit", async () => {
    const id = await makeTestUser();
    const cat = await prisma.category.create({
      data: { userId: id, name: "Tes Kategori", type: "EXPENSE" },
    });
    const cat2 = await prisma.category.create({
      data: { userId: id, name: "Tes Kategori 2", type: "EXPENSE" },
    });
    await makeLimitPlan("EF_BUDGET", "budget.limit", 1);
    await grantSubscription(id, "EF_BUDGET", { days: 30 });

    const ok = await postBudget(
      new NextRequest("http://x/api/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: cat.id, amount: 100000 }),
      })
    );
    expect(ok.status).toBe(200);

    const blocked = await postBudget(
      new NextRequest("http://x/api/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: cat2.id, amount: 50000 }),
      })
    );
    expect(blocked.status).toBe(409);
    expect((await blocked.json()).code).toBe("BUDGET_LIMIT_REACHED");
  });
});