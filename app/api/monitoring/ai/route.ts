import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withMonitoring } from "@/lib/monitoring";
import { requireMonitoringOwner } from "@/lib/monitoring";

async function GETHandler(req: NextRequest) {
  const user = await requireMonitoringOwner();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10), 1), 180);
    const since = new Date(Date.now() - days * 86_400_000);
    const now = new Date();

    // Daily rollup for charts
    const dailyRows = await prisma.$queryRaw<
      Array<{
        date: string;
        calls: number;
        success: number;
        failed: number;
        costUsd: number;
      }>
    >`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS calls,
             COUNT(*) FILTER (WHERE success)::int AS success,
             COUNT(*) FILTER (WHERE NOT success)::int AS failed,
             ROUND(SUM("costUsd")::numeric, 6) AS "costUsd"
      FROM "gemini_call_log"
      WHERE "createdAt" >= ${since}
      GROUP BY to_char("createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `;

    // Total aggregates
    const [totalCalls, totalSuccess, totalCost, monthCalls, monthSuccess, monthCost] =
      await Promise.all([
        prisma.geminiCallLog.count({ where: { createdAt: { gte: since } } }),
        prisma.geminiCallLog.count({
          where: { createdAt: { gte: since }, success: true },
        }),
        prisma.geminiCallLog.aggregate({
          where: { createdAt: { gte: since } },
          _sum: { costUsd: true },
        }),
        prisma.geminiCallLog.count({
          where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        }),
        prisma.geminiCallLog.count({
          where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }, success: true },
        }),
        prisma.geminiCallLog.aggregate({
          where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
          _sum: { costUsd: true },
        }),
      ]);

    const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100;
    const monthSuccessRate = monthCalls > 0 ? (monthSuccess / monthCalls) * 100 : 100;

    // Recent failures (last 10)
    const recentFailures = await prisma.geminiCallLog.findMany({
      where: { success: false, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        model: true,
        statusCode: true,
        durationMs: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      daily: dailyRows,
      total: {
        calls: totalCalls,
        successRate: Math.round(successRate * 100) / 100,
        costUsd: Math.round((totalCost._sum.costUsd ?? 0) * 10000) / 10000,
      },
      month: {
        calls: monthCalls,
        successRate: Math.round(monthSuccessRate * 100) / 100,
        costUsd: Math.round((monthCost._sum.costUsd ?? 0) * 10000) / 10000,
      },
      recentFailures,
      days,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error GET /api/monitoring/ai:", error);
    return NextResponse.json(
      { error: message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = withMonitoring("monitoring/ai", GETHandler);