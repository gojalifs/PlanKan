import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withMonitoring } from "@/lib/monitoring";
import { requireBillingAdmin } from "@/lib/monitoring";
import { grantSubscription } from "@/lib/subscriptions";
import { z } from "zod";

const grantSchema = z
  .object({
    email: z.string().trim().min(1).toLowerCase(),
    planKey: z.string().trim().min(1),
    days: z.number().int().positive().optional(),
    months: z.number().int().positive().optional(),
  })
  .refine((v) => v.days !== undefined || v.months !== undefined || true, {
    message: "Berikan days atau months untuk periode langganan",
  });

// GET /api/admin/subscriptions
// Owner-gated billing inbox: every subscription (history) with user + plan.
async function GETHandler() {
  const owner = await requireBillingAdmin();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    include: {
      plan: { select: { key: true, name: true, priceMonthly: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ subscriptions });
}

// POST /api/admin/subscriptions  { email, planKey, days | months }
// Grants (or switches) a user's plan. In-flight subscriptions are cancelled
// (history preserved) — Phase 3 MVP billing is manual.
async function POSTHandler(request: Request) {
  const owner = await requireBillingAdmin();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = grantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Data tidak valid" },
      { status: 400 }
    );
  }
  const { email, planKey, days, months } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: `User ${email} tidak ditemukan` }, { status: 404 });
  }

  try {
    const subscription = await grantSubscription(user.id, planKey, { days, months });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memberikan langganan";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export const GET = withMonitoring("admin-subscriptions", GETHandler);
export const POST = withMonitoring("admin-subscriptions", POSTHandler);