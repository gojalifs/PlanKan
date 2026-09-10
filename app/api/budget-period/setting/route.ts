import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/budget-period/setting
async function GETHandler() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.budgetPeriodSetting.findUnique({
      where: { userId: session.user.id },
    });

    // Return setting or the implicit default
    return NextResponse.json({
      method: setting?.method ?? "LAST_WORKING_DAY",
      fixedDay: setting?.fixedDay ?? null,
    });
  } catch (error: any) {
    console.error("GET /api/budget-period/setting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/budget-period/setting
// Body: { method: "LAST_WORKING_DAY" | "FIXED_DAY", fixedDay?: number }
async function PUTHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { method, fixedDay } = body as { method: string; fixedDay?: number | null };

    if (!["LAST_WORKING_DAY", "FIXED_DAY"].includes(method)) {
      return NextResponse.json({ error: "Method tidak valid" }, { status: 400 });
    }

    if (method === "FIXED_DAY") {
      const day = Number(fixedDay);
      if (!Number.isInteger(day) || day < 1 || day > 28) {
        return NextResponse.json(
          { error: "fixedDay harus berupa angka 1–28" },
          { status: 400 }
        );
      }
    }

    const setting = await prisma.budgetPeriodSetting.upsert({
      where: { userId: session.user.id },
      update: {
        method,
        fixedDay: method === "FIXED_DAY" ? Number(fixedDay) : null,
      },
      create: {
        userId: session.user.id,
        method,
        fixedDay: method === "FIXED_DAY" ? Number(fixedDay) : null,
      },
    });

    return NextResponse.json(setting);
  } catch (error: any) {
    console.error("PUT /api/budget-period/setting:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withMonitoring("budget-period/setting", GETHandler);
export const PUT = withMonitoring("budget-period/setting", PUTHandler);
