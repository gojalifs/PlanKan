import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/budget-period/overrides?month=8&year=2026
// Returns all overrides for the user, optionally filtered by month+year.
async function GETHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const where: any = { userId: session.user.id };
    if (monthParam) where.month = parseInt(monthParam, 10);
    if (yearParam) where.year = parseInt(yearParam, 10);

    const overrides = await prisma.budgetPeriodOverride.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(overrides);
  } catch (error: any) {
    console.error("GET /api/budget-period/overrides:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/budget-period/overrides
// Body: { month, year, startDay }
// Creates or replaces an override for the given month/year.
async function POSTHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const month = parseInt(body.month, 10);
    const year = parseInt(body.year, 10);
    const startDay = parseInt(body.startDay, 10);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json({ error: "month dan year tidak valid" }, { status: 400 });
    }
    if (!startDay || startDay < 1 || startDay > 31) {
      return NextResponse.json({ error: "startDay harus 1–31" }, { status: 400 });
    }

    const override = await prisma.budgetPeriodOverride.upsert({
      where: {
        userId_month_year: {
          userId: session.user.id,
          month,
          year,
        },
      },
      update: { startDay },
      create: {
        userId: session.user.id,
        month,
        year,
        startDay,
      },
    });

    return NextResponse.json(override);
  } catch (error: any) {
    console.error("POST /api/budget-period/overrides:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/budget-period/overrides?month=8&year=2026
async function DELETEHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "", 10);
    const year = parseInt(searchParams.get("year") || "", 10);

    if (!month || !year) {
      return NextResponse.json({ error: "month dan year wajib diisi" }, { status: 400 });
    }

    await prisma.budgetPeriodOverride.deleteMany({
      where: { userId: session.user.id, month, year },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/budget-period/overrides:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withMonitoring("budget-period/overrides", GETHandler);
export const POST = withMonitoring("budget-period/overrides", POSTHandler);
export const DELETE = withMonitoring("budget-period/overrides", DELETEHandler);
