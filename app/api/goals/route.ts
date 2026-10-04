import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { canUse } from "@/lib/entitlement";
import { withMonitoring } from "@/lib/monitoring";
import { z } from "zod";

/**
 * Financial goals (Phase 4 / monetise.md §4, §20). Server-side gate on the
 * `ai.financial_goals` entitlement (Plus+) — a Free/Starter client can never
 * bypass the upsell by calling the API directly (§12: don't trust the client).
 */

export const GOAL_FEATURE = "ai.financial_goals";

export function goalNotEntitledBody() {
  return {
    error: "Tujuan keuangan tersedia di paket Plus ke atas. Lihat paket untuk mengaktifkannya.",
    code: "FINANCIAL_GOALS_REQUIRED",
  };
}

function parseTargetDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Nama tujuan wajib diisi").max(100, "Nama terlalu panjang"),
  targetAmount: z.number().positive("Target harus lebih besar dari 0").max(1e12),
  currentAmount: z.number().nonnegative().max(1e12).default(0),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal target tidak valid")
    .nullable()
    .optional(),
  walletId: z.string().min(1).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid").default("#10b981"),
});

export type GoalCreateInput = z.infer<typeof createGoalSchema>;

/** Prisma returns Decimal as JSON string; normalize to number for the client. */
export function serializeGoal<
  T extends { targetAmount: unknown; currentAmount: unknown }
>(goal: T) {
  return { ...goal, targetAmount: Number(goal.targetAmount), currentAmount: Number(goal.currentAmount) };
}

export function goalStatusFor(current: number, target: number) {
  return current >= target ? ("COMPLETED" as const) : ("ACTIVE" as const);
}

// GET /api/goals — all goals for the user with computed progress.
async function GETHandler() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await prisma.financialGoal.findMany({
      where: { userId: session.user.id, status: { not: "ARCHIVED" } },
      include: { wallet: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const decorated = goals.map((g) => {
      const target = Number(g.targetAmount);
      const saved = Number(g.currentAmount);
      const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      return {
        ...g,
        targetAmount: target,
        currentAmount: saved,
        remaining: Math.max(0, target - saved),
        percent,
      };
    });

    const summary = decorated.reduce(
      (acc, g) => {
        acc.totalTarget += g.targetAmount;
        acc.totalSaved += g.currentAmount;
        if (g.status === "ACTIVE") acc.activeCount += 1;
        return acc;
      },
      { totalTarget: 0, totalSaved: 0, activeCount: 0 }
    );

    return NextResponse.json({ goals: decorated, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat tujuan";
    console.error("GET /api/goals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/goals — create a financial goal (Plus+ entitlement).
async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await canUse(session.user.id, GOAL_FEATURE))) {
      return NextResponse.json(goalNotEntitledBody(), { status: 403 });
    }

    const body = await request.json();
    const validated = createGoalSchema.parse(body);

    if (validated.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: validated.walletId, userId: session.user.id },
        select: { id: true },
      });
      if (!wallet) {
        return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 400 });
      }
    }

    const status = goalStatusFor(validated.currentAmount, validated.targetAmount);
    const goal = await prisma.financialGoal.create({
      data: {
        userId: session.user.id,
        name: validated.name,
        targetAmount: validated.targetAmount,
        currentAmount: validated.currentAmount,
        targetDate: parseTargetDate(validated.targetDate),
        walletId: validated.walletId ?? null,
        color: validated.color,
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      include: { wallet: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ goal: serializeGoal(goal) }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; errors?: Array<{ message?: string }>; message?: string };
    if (e.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message || "Data tidak valid" }, { status: 400 });
    }
    const message = e.message || "Gagal membuat tujuan";
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMonitoring("goals", GETHandler);
export const POST = withMonitoring("goals", POSTHandler);