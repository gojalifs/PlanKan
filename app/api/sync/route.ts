import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getAccessScope } from "@/lib/workspace";
import { withMonitoring } from "@/lib/monitoring";

async function GETHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { or } = await getAccessScope(session.user.id);

    const { searchParams } = new URL(request.url);
    const sinceRaw = searchParams.get("since");
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10) || 500, 1000);

    const since = sinceRaw ? new Date(sinceRaw) : new Date(0);
    if (Number.isNaN(since.getTime())) {
      return NextResponse.json({ error: "Parameter 'since' tidak valid" }, { status: 400 });
    }

    const [transactions, categories, budgets] = await Promise.all([
      prisma.transaction.findMany({
        where: { OR: or, updatedAt: { gte: since } },
        orderBy: { updatedAt: "asc" },
        take: limit,
        include: { wallet: true, destinationWallet: true, category: true },
      }),
      prisma.category.findMany({
        where: { OR: or, updatedAt: { gte: since } },
        orderBy: { updatedAt: "asc" },
        take: limit,
      }),
      prisma.budget.findMany({
        where: { OR: or, updatedAt: { gte: since } },
        orderBy: { updatedAt: "asc" },
        take: limit,
      }),
    ]);

    // Wallets: scope by accessible workspaces (same as /api/wallets).
    const { getAccessibleWorkspaceIds } = await import("@/lib/workspace");
    const workspaceIds = await getAccessibleWorkspaceIds(session.user.id);
    const walletsScoped = await prisma.wallet.findMany({
      where: {
        OR: [
          { userId: session.user.id, workspaceId: null },
          ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
        ],
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
      include: { _count: { select: { transactions: true, transfersIn: true } } },
    });

    const serverTime = new Date().toISOString();

    return NextResponse.json({
      serverTime,
      since: since.toISOString(),
      transactions,
      wallets: walletsScoped,
      categories,
      budgets,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error GET /api/sync:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMonitoring("sync", GETHandler);
