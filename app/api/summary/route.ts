import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { withMonitoring } from "@/lib/monitoring";
import {
  ANOMALY_WINDOW_DAYS,
  detectAnomaly,
  expenseAnomalyBucket,
  type ExpenseForAnomaly,
} from "@/lib/anomaly";

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

    // Read-time anomalies: recompute over the 90-day rolling window for the
    // recent candidates only (catches pre-existing rows too). Each candidate is
    // excluded from its own bucket baseline.
    const windowStart = new Date(now.getTime() - ANOMALY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const expenseHistory = await prisma.transaction.findMany({
      where: { userId: session.user.id, type: "EXPENSE", date: { gte: windowStart } },
      select: { id: true, amount: true, category: { select: { id: true, parentId: true } } },
    });

    const bucketEntries = new Map<string, Array<{ txId: string; amount: number }>>();
    for (const t of expenseHistory) {
      const key = expenseAnomalyBucket({
        categoryId: t.category?.id ?? null,
        parentCategoryId: t.category?.parentId ?? t.category?.id ?? null,
      }).key;
      if (!bucketEntries.has(key)) bucketEntries.set(key, []);
      bucketEntries.get(key)!.push({ txId: t.id, amount: Number(t.amount) });
    }

    const recentAnomalies: Array<{
      transactionId: string;
      amount: number;
      date: string;
      parentCategoryName: string;
      median: number;
      reason: string;
    }> = [];

    for (const t of recentTransactions) {
      if (recentAnomalies.length >= 5) break;
      if (t.type !== "EXPENSE") continue;

      const selfKey = expenseAnomalyBucket({
        categoryId: t.category?.id ?? null,
        parentCategoryId: t.category?.parent?.id ?? t.category?.id ?? null,
        parentCategoryName: t.category?.parent?.name ?? null,
      });
      const entries = bucketEntries.get(selfKey.key);
      if (!entries) continue;

      const candidate: ExpenseForAnomaly = {
        amount: Number(t.amount),
        categoryId: t.category?.id ?? null,
        parentCategoryId: t.category?.parent?.id ?? t.category?.id ?? null,
        parentCategoryName: t.category?.parent?.name ?? null,
      };
      const baseline = entries.filter((e) => e.txId !== t.id).map((e) => e.amount);
      const result = detectAnomaly(candidate, baseline);

      if (result.isAnomaly) {
        recentAnomalies.push({
          transactionId: t.id,
          amount: candidate.amount,
          date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
          parentCategoryName: selfKey.name,
          median: result.median,
          reason: result.reason!,
        });
      }
    }

    return NextResponse.json({
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      netCashflow: monthlyIncome - monthlyExpense,
      wallets,
      recentTransactions,
      categoryExpenses: Object.values(categoryExpenseMap).sort((a, b) => b.amount - a.amount),
      recentAnomalies,
    });
  } catch (error: any) {
    console.error("Error GET /api/summary:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("summary", GETHandler);
