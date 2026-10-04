import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { canUse } from "@/lib/entitlement";
import { withMonitoring } from "@/lib/monitoring";
import { z } from "zod";
import { GOAL_FEATURE, goalNotEntitledBody, goalStatusFor, serializeGoal } from "../route";

const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ARCHIVED"] as const;

const updateGoalSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    targetAmount: z.number().positive().max(1e12).optional(),
    currentAmount: z.number().nonnegative().max(1e12).optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal target tidak valid")
      .nullable()
      .optional(),
    walletId: z.string().min(1).nullable().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    status: z.enum(GOAL_STATUSES).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada data yang diperbarui" });

function parseTargetDate(value: string | null | undefined): Date | null | "SKIP" {
  if (value === undefined) return "SKIP";
  if (value === null) return null;
  const [y, m, d] = value.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateOnlyInput(targetDate: Date | null | "SKIP"): { targetDate: Date | null } | undefined {
  if (targetDate === "SKIP") return undefined;
  return { targetDate };
}

// PUT /api/goals/[id] — partial update; status auto-recomputed from amounts
// unless an explicit status was given.
async function PUTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canUse(session.user.id, GOAL_FEATURE))) {
      return NextResponse.json(goalNotEntitledBody(), { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validated = updateGoalSchema.parse(body);

    const existing = await prisma.financialGoal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tujuan tidak ditemukan" }, { status: 404 });
    }

    if (validated.walletId !== undefined && validated.walletId !== null) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: validated.walletId, userId: session.user.id },
        select: { id: true },
      });
      if (!wallet) {
        return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = { ...validated };

    const nextTarget = validated.targetAmount ?? Number(existing.targetAmount);
    const nextCurrent = validated.currentAmount ?? Number(existing.currentAmount);
    const nextStatus = validated.status ?? goalStatusFor(nextCurrent, nextTarget);
    data.status = nextStatus;
    data.completedAt = nextStatus === "COMPLETED" ? new Date() : null;

    const datePart = toDateOnlyInput(parseTargetDate(validated.targetDate));
    if (datePart) data.targetDate = datePart.targetDate;

    const goal = await prisma.financialGoal.update({
      where: { id },
      data,
      include: { wallet: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ goal: serializeGoal(goal) });
  } catch (error: unknown) {
    const e = error as { name?: string; errors?: Array<{ message?: string }>; message?: string };
    if (e.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message || "Data tidak valid" }, { status: 400 });
    }
    const message = e.message || "Gagal memperbarui tujuan";
    console.error("PUT /api/goals/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function DELETEHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canUse(session.user.id, GOAL_FEATURE))) {
      return NextResponse.json(goalNotEntitledBody(), { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.financialGoal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tujuan tidak ditemukan" }, { status: 404 });
    }

    await prisma.financialGoal.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Tujuan berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus tujuan";
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const PUT = withMonitoring("goals/[id]", PUTHandler);
export const DELETE = withMonitoring("goals/[id]", DELETEHandler);