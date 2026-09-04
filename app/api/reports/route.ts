import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // 1-12
    const yearParam = searchParams.get("year"); // e.g. 2026

    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // -- 1. Monthly totals (income vs expense) for the last 6 months --
    const monthlyTrends: Array<{
      month: string;
      income: number;
      expense: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const txs = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          date: { gte: start, lte: end },
          type: { in: ["INCOME", "EXPENSE"] },
        },
        select: { type: true, amount: true },
      });

      let income = 0;
      let expense = 0;
      for (const t of txs) {
        if (t.type === "INCOME") income += Number(t.amount);
        else expense += Number(t.amount);
      }

      monthlyTrends.push({
        month: start.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
        income,
        expense,
      });
    }

    // -- 2. Expense by category (current selected month) --
    const expenseTxs = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
        type: "EXPENSE",
      },
      include: {
        category: {
          include: { parent: true },
        },
      },
    });

    const categoryMap: Record<
      string,
      { name: string; color: string; amount: number; icon: string }
    > = {};

    for (const t of expenseTxs) {
      // Use parent category if sub-category
      const cat = t.category?.parent || t.category;
      const key = cat?.id || "none";
      if (!categoryMap[key]) {
        categoryMap[key] = {
          name: cat?.name || "Tanpa Kategori",
          color: cat?.color || "#94a3b8",
          icon: cat?.icon || "Tag",
          amount: 0,
        };
      }
      categoryMap[key].amount += Number(t.amount);
    }

    const categoryExpenses = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

    // -- 3. Daily expense trend for the current month --
    const dailyExpenses: Array<{ day: number; amount: number }> = [];

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyMap: Record<number, number> = {};

    for (const t of expenseTxs) {
      const day = new Date(t.date).getDate();
      dailyMap[day] = (dailyMap[day] || 0) + Number(t.amount);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      dailyExpenses.push({ day: d, amount: dailyMap[d] || 0 });
    }

    // -- 4. Income by category (current month) --
    const incomeTxs = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
        type: "INCOME",
      },
      include: {
        category: {
          include: { parent: true },
        },
      },
    });

    const incomeCategoryMap: Record<
      string,
      { name: string; color: string; amount: number }
    > = {};

    for (const t of incomeTxs) {
      const cat = t.category?.parent || t.category;
      const key = cat?.id || "none";
      if (!incomeCategoryMap[key]) {
        incomeCategoryMap[key] = {
          name: cat?.name || "Tanpa Kategori",
          color: cat?.color || "#22c55e",
          amount: 0,
        };
      }
      incomeCategoryMap[key].amount += Number(t.amount);
    }

    const categoryIncomes = Object.values(incomeCategoryMap).sort((a, b) => b.amount - a.amount);

    // -- 5. Top 5 expense sub-categories (for detailed pie) --
    const subCategoryMap: Record<
      string,
      { name: string; color: string; amount: number; parentName: string }
    > = {};

    for (const t of expenseTxs) {
      const cat = t.category;
      if (!cat) continue;
      const key = cat.id;
      if (!subCategoryMap[key]) {
        subCategoryMap[key] = {
          name: cat.name,
          color: cat.color || "#94a3b8",
          parentName: cat.parent?.name || cat.name,
          amount: 0,
        };
      }
      subCategoryMap[key].amount += Number(t.amount);
    }

    const topSubCategories = Object.values(subCategoryMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // -- 6. Monthly summary --
    const monthlyIncome = incomeTxs.reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpense = expenseTxs.reduce((s, t) => s + Number(t.amount), 0);

    return NextResponse.json({
      monthlyTrends,
      categoryExpenses,
      categoryIncomes,
      dailyExpenses,
      topSubCategories,
      summary: {
        income: monthlyIncome,
        expense: monthlyExpense,
        net: monthlyIncome - monthlyExpense,
      },
      selectedPeriod: {
        month,
        year,
        label: startOfMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      },
    });
  } catch (error: any) {
    console.error("Error GET /api/reports:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
