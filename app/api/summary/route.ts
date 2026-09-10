import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { withMonitoring } from "@/lib/monitoring";

async function GETHandler() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch wallets
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    const totalNetWorth = wallets
      .filter((w) => !w.isExcludedFromTotal)
      .reduce((acc, w) => acc + Number(w.balance), 0);

    // Fetch monthly transactions
    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    const categoryExpenseMap: Record<string, { name: string; color: string; amount: number }> = {};

    for (const t of monthlyTransactions) {
      const amt = Number(t.amount);
      if (t.type === "INCOME") {
        monthlyIncome += amt;
      } else if (t.type === "EXPENSE") {
        monthlyExpense += amt;
        // Aggregate sub-categories under their Parent Category on Dashboard
        const parentCategory = t.category?.parent || t.category;
        const catName = parentCategory?.name || "Tanpa Kategori";
        const catColor = parentCategory?.color || "#94a3b8";
        if (!categoryExpenseMap[catName]) {
          categoryExpenseMap[catName] = { name: catName, color: catColor, amount: 0 };
        }
        categoryExpenseMap[catName].amount += amt;
      }
    }

    // Recent 10 transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        wallet: true,
        destinationWallet: true,
        category: {
          include: {
            parent: true,
          },
        },
      },
    });

    return NextResponse.json({
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      netCashflow: monthlyIncome - monthlyExpense,
      wallets,
      recentTransactions,
      categoryExpenses: Object.values(categoryExpenseMap).sort((a, b) => b.amount - a.amount),
    });
  } catch (error: any) {
    console.error("Error GET /api/summary:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("summary", GETHandler);
