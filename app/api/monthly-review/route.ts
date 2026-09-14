import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";
import { fetchMonthlyStats, conditionFromStats, buildFallbackSuggestions } from "@/lib/monthly-review";
import { generateMonthlyReviewText } from "@/lib/ai-review";

const paramsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

/** Shape returned by GET/POST — matches the hook's expected shape. */
interface MonthlyReviewPayload {
  month: number;
  year: number;
  stats: ReturnType<typeof conditionFromStats> extends never ? never : unknown;
  conditionLabel: string | null;
  summary: string | null;
  suggestions: string[];
  source: "gemini" | "fallback";
  updatedAt: string;
}

async function GETHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const { searchParams } = new URL(request.url);
    const monthRaw = searchParams.get("month");
    const yearRaw = searchParams.get("year");
    const now = new Date();
    const month = monthRaw ? parseInt(monthRaw, 10) : now.getMonth() + 1;
    const year = yearRaw ? parseInt(yearRaw, 10) : now.getFullYear();
    const { month: m, year: y } = paramsSchema.parse({ month, year });

    // Return cached review if present
    const cached = await prisma.monthlyReview.findUnique({
      where: { userId_month_year: { userId: session.user.id, month: m, year: y } },
    });

    if (cached) {
      return NextResponse.json({
        month: m,
        year: y,
        stats: cached.statsJson,
        conditionLabel: cached.conditionLabel,
        summary: cached.summary,
        suggestions: cached.suggestions as string[],
        source: cached.source as "gemini" | "fallback",
        updatedAt: cached.updatedAt.toISOString(),
      } satisfies MonthlyReviewPayload);
    }

    // Compute fresh
    const stats = await fetchMonthlyStats(session.user.id, m, y);
    const { emoji, label: conditionLabel } = conditionFromStats(stats);

    let summary: string | null = null;
    let suggestions: string[];
    let source: "gemini" | "fallback";

    try {
      const ai = await generateMonthlyReviewText(stats);
      summary = ai.summary;
      suggestions = ai.suggestions.length > 0 ? ai.suggestions : buildFallbackSuggestions(stats);
      source = ai.source;
    } catch {
      suggestions = buildFallbackSuggestions(stats);
      source = "fallback";
    }

    const upserted = await prisma.monthlyReview.upsert({
      where: { userId_month_year: { userId: session.user.id, month: m, year: y } },
      create: {
        userId: session.user.id,
        month: m,
        year: y,
        statsJson: stats as unknown as Prisma.InputJsonValue,
        conditionLabel: `${emoji} ${conditionLabel}`,
        summary,
        suggestions,
        source,
      },
      update: {
        statsJson: stats as unknown as Prisma.InputJsonValue,
        conditionLabel: `${emoji} ${conditionLabel}`,
        summary,
        suggestions,
        source,
      },
    });

    return NextResponse.json({
      month: m,
      year: y,
      stats: upserted.statsJson,
      conditionLabel: upserted.conditionLabel,
      summary: upserted.summary,
      suggestions: upserted.suggestions as string[],
      source: upserted.source as "gemini" | "fallback",
      updatedAt: upserted.updatedAt.toISOString(),
    } satisfies MonthlyReviewPayload);
  } catch (error: any) {
    console.error("Error GET /api/monthly-review:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Parameter bulan/tahun tidak valid", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const month = typeof body.month === "number" ? body.month : now.getMonth() + 1;
    const year = typeof body.year === "number" ? body.year : now.getFullYear();
    const { month: m, year: y } = paramsSchema.parse({ month, year });

    const stats = await fetchMonthlyStats(session.user.id, m, y);
    const { emoji, label: conditionLabel } = conditionFromStats(stats);

    let summary: string | null = null;
    let suggestions: string[];
    let source: "gemini" | "fallback";

    try {
      const ai = await generateMonthlyReviewText(stats);
      summary = ai.summary;
      suggestions = ai.suggestions.length > 0 ? ai.suggestions : buildFallbackSuggestions(stats);
      source = ai.source;
    } catch {
      suggestions = buildFallbackSuggestions(stats);
      source = "fallback";
    }

    const upserted = await prisma.monthlyReview.upsert({
      where: { userId_month_year: { userId: session.user.id, month: m, year: y } },
      create: {
        userId: session.user.id,
        month: m,
        year: y,
        statsJson: stats as unknown as Prisma.InputJsonValue,
        conditionLabel: `${emoji} ${conditionLabel}`,
        summary,
        suggestions,
        source,
      },
      update: {
        statsJson: stats as unknown as Prisma.InputJsonValue,
        conditionLabel: `${emoji} ${conditionLabel}`,
        summary,
        suggestions,
        source,
      },
    });

    return NextResponse.json({
      month: m,
      year: y,
      stats: upserted.statsJson,
      conditionLabel: upserted.conditionLabel,
      summary: upserted.summary,
      suggestions: upserted.suggestions as string[],
      source: upserted.source as "gemini" | "fallback",
      updatedAt: upserted.updatedAt.toISOString(),
    } satisfies MonthlyReviewPayload);
  } catch (error: any) {
    console.error("Error POST /api/monthly-review:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Parameter bulan/tahun tidak valid", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("monthly-review", GETHandler);
export const POST = withMonitoring("monthly-review", POSTHandler);