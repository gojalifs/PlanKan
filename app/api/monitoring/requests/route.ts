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
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "7", 10), 1), 90);
    const since = new Date(Date.now() - days * 86_400_000);

    // Per-route stats with p95/p99 via raw SQL
    const rows = await prisma.$queryRaw<
      Array<{
        method: string;
        route: string;
        count: number;
        errorCount: number;
        avgMs: number;
        p95: number;
        p99: number;
      }>
    >`
      SELECT method, route,
             COUNT(*)::int AS count,
             COUNT(*) FILTER (WHERE status >= 400)::int AS "errorCount",
             ROUND(AVG("durationMs")::numeric, 1) AS "avgMs",
             ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "durationMs")::numeric, 1) AS p95,
             ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "durationMs")::numeric, 1) AS p99
      FROM "api_log"
      WHERE "createdAt" >= ${since}
      GROUP BY method, route
      ORDER BY p99 DESC
    `;

    return NextResponse.json({ routes: rows, days });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error GET /api/monitoring/requests:", error);
    return NextResponse.json(
      { error: message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const GET = withMonitoring("monitoring/requests", GETHandler);