import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withMonitoring } from "@/lib/monitoring";
import { requireMonitoringOwner } from "@/lib/monitoring";

async function GETHandler() {
  const user = await requireMonitoringOwner();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    // --- API Overview (7 days) ---
    const [
      totalRequests7d,
      errorRequests7d,
      avgDuration,
      p95Duration,
      p99Duration,
    ] = await Promise.all([
      prisma.apiLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.apiLog.count({ where: { createdAt: { gte: sevenDaysAgo }, status: { gte: 400 } } }),
      prisma.apiLog.aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _avg: { durationMs: true },
      }),
      prisma.$queryRaw<{ p95: number }[]>`
        SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::numeric AS p95
        FROM "api_log" WHERE "createdAt" >= ${sevenDaysAgo}
      `,
      prisma.$queryRaw<{ p99: number }[]>`
        SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "durationMs")::numeric AS p99
        FROM "api_log" WHERE "createdAt" >= ${sevenDaysAgo}
      `,
    ]);

    const errorRate = totalRequests7d > 0 ? (errorRequests7d / totalRequests7d) * 100 : 0;

    // --- Recent errors (10 latest) ---
    const recentErrors = await prisma.apiLog.findMany({
      where: { status: { gte: 400 }, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { route: true, method: true, status: true, error: true, createdAt: true },
    });

    // --- Gemini Overview (today + month) ---
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCalls, todaySuccess, todayCost, monthCalls, monthSuccess, monthCost] =
      await Promise.all([
        prisma.geminiCallLog.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.geminiCallLog.count({
          where: { createdAt: { gte: startOfToday }, success: true },
        }),
        prisma.geminiCallLog.aggregate({
          where: { createdAt: { gte: startOfToday } },
          _sum: { costUsd: true },
        }),
        prisma.geminiCallLog.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.geminiCallLog.count({
          where: { createdAt: { gte: startOfMonth }, success: true },
        }),
        prisma.geminiCallLog.aggregate({
          where: { createdAt: { gte: startOfMonth } },
          _sum: { costUsd: true },
        }),
      ]);

    const todaySuccessRate = todayCalls > 0 ? (todaySuccess / todayCalls) * 100 : 100;
    const monthSuccessRate = monthCalls > 0 ? (monthSuccess / monthCalls) * 100 : 100;

    return NextResponse.json({
      api: {
        requests7d: totalRequests7d,
        errorCount: errorRequests7d,
        errorRate: Math.round(errorRate * 100) / 100,
        avgMs: Math.round((avgDuration._avg.durationMs ?? 0) * 10) / 10,
        p95Ms: Math.round((p95Duration[0]?.p95 ?? 0) * 10) / 10,
        p99Ms: Math.round((p99Duration[0]?.p99 ?? 0) * 10) / 10,
      },
      gemini: {
        today: {
          calls: todayCalls,
          successRate: Math.round(todaySuccessRate * 100) / 100,
          costUsd: Math.round((todayCost._sum.costUsd ?? 0) * 10000) / 10000,
        },
        month: {
          calls: monthCalls,
          successRate: Math.round(monthSuccessRate * 100) / 100,
          costUsd: Math.round((monthCost._sum.costUsd ?? 0) * 10000) / 10000,
        },
      },
      recentErrors: recentErrors.map((e) => ({
        route: e.route,
        method: e.method,
        status: e.status,
        error: e.error,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error GET /api/monitoring/overview:", error);
    return NextResponse.json(
      { error: message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = withMonitoring("monitoring/overview", GETHandler);