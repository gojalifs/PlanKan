import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBudgetPeriod } from "@/lib/budget-period";

// GET /api/budgets?month=8&year=2026
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    // Resolve budget period using setting + override
    const [periodSetting, periodOverride] = await Promise.all([
      prisma.budgetPeriodSetting.findUnique({ where: { userId: session.user.id } }),
      prisma.budgetPeriodOverride.findUnique({
        where: { userId_month_year: { userId: session.user.id, month, year } },
      }),
    ]);

    const { startDate, endDate, label: periodLabel, isOverridden } = resolveBudgetPeriod(
      month,
      year,
      periodOverride,
      periodSetting
    );

    // 1. Get all EXPENSE categories for this user (both parents and sub-categories)
    const expenseCategories = await prisma.category.findMany({
      where: {
        type: "EXPENSE",
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      include: {
        parent: true,
        children: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ parentId: "asc" }, { isDefault: "desc" }, { name: "asc" }],
    });

    // 2. Get user's budgets
    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
      },
    });

    const budgetMap = new Map<string, (typeof budgets)[0]>();
    budgets.forEach((b) => budgetMap.set(b.categoryId, b));

    // 3. Get transactions for this month grouped by category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        categoryId: true,
      },
    });

    const directSpentMap = new Map<string, number>();
    let totalOverallExpense = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      totalOverallExpense += amt;
      if (tx.categoryId) {
        directSpentMap.set(tx.categoryId, (directSpentMap.get(tx.categoryId) || 0) + amt);
      }
    });

    // Separate parent categories (parentId === null) and build hierarchy
    const parentCategories = expenseCategories.filter((c) => !c.parentId);

    let totalBudgeted = 0;
    let totalSpentInBudgetedCategories = 0;
    let overbudgetCount = 0;
    let budgetCount = 0;

    const items = parentCategories.map((parent) => {
      const parentBudget = budgetMap.get(parent.id);
      const directBudgetAmount = parentBudget ? Number(parentBudget.amount) : 0;
      const directSpentAmount = directSpentMap.get(parent.id) || 0;

      // Sub-categories under this parent
      const subCategories = (parent.children || []).map((sub) => {
        const subBudget = budgetMap.get(sub.id);
        const subBudgetAmount = subBudget ? Number(subBudget.amount) : 0;
        const subSpentAmount = directSpentMap.get(sub.id) || 0;
        const subRemainingAmount = subBudget ? subBudgetAmount - subSpentAmount : -subSpentAmount;
        const subPercentage = subBudgetAmount > 0 ? (subSpentAmount / subBudgetAmount) * 100 : 0;
        const subHasBudget = Boolean(subBudget);

        if (subHasBudget && subSpentAmount > subBudgetAmount) {
          overbudgetCount += 1;
        }

        return {
          id: subBudget?.id || null,
          categoryId: sub.id,
          categoryName: sub.name,
          categoryColor: sub.color,
          categoryIcon: sub.icon,
          parentId: parent.id,
          parentName: parent.name,
          budgetAmount: subBudgetAmount,
          spentAmount: subSpentAmount,
          remainingAmount: subRemainingAmount,
          percentage: subPercentage,
          hasBudget: subHasBudget,
          updatedAt: subBudget?.updatedAt || null,
        };
      });

      const subBudgetsTotal = subCategories.reduce((acc, s) => acc + s.budgetAmount, 0);
      const subSpentTotal = subCategories.reduce((acc, s) => acc + s.spentAmount, 0);

      const totalSpent = directSpentAmount + subSpentTotal;
      // If direct parent budget is set, use it; otherwise use sum of sub-budgets
      const effectiveBudgetAmount =
        directBudgetAmount > 0 ? directBudgetAmount : subBudgetsTotal;
      const hasBudget = Boolean(directBudgetAmount > 0 || subBudgetsTotal > 0);
      const remainingAmount = hasBudget ? effectiveBudgetAmount - totalSpent : -totalSpent;
      const percentage = effectiveBudgetAmount > 0 ? (totalSpent / effectiveBudgetAmount) * 100 : 0;

      if (hasBudget) {
        totalBudgeted += effectiveBudgetAmount;
        totalSpentInBudgetedCategories += totalSpent;
        budgetCount += 1;
        if (directBudgetAmount > 0 && totalSpent > directBudgetAmount) {
          overbudgetCount += 1;
        }
      }

      return {
        id: parentBudget?.id || null,
        categoryId: parent.id,
        categoryName: parent.name,
        categoryColor: parent.color,
        categoryIcon: parent.icon,
        parentId: null,
        directBudgetAmount,
        subBudgetsTotal,
        budgetAmount: effectiveBudgetAmount,
        directSpentAmount,
        spentAmount: totalSpent,
        remainingAmount,
        percentage,
        hasBudget,
        hasDirectBudget: Boolean(parentBudget),
        subCategories,
        updatedAt: parentBudget?.updatedAt || null,
      };
    });

    const remainingBudget = totalBudgeted - totalSpentInBudgetedCategories;
    const overallPercentage =
      totalBudgeted > 0 ? (totalSpentInBudgetedCategories / totalBudgeted) * 100 : 0;

    return NextResponse.json({
      month,
      year,
      periodLabel,
      isOverridden,
      summary: {
        totalBudgeted,
        totalSpentInBudgetedCategories,
        totalOverallExpense,
        remainingBudget,
        overallPercentage,
        budgetCount,
        overbudgetCount,
      },
      items,
    });
  } catch (error: any) {
    console.error("GET /api/budgets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}

// POST /api/budgets
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categoryId, amount } = body;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Nominal budget harus berupa angka positif" },
        { status: 400 }
      );
    }

    // Verify category exists and is EXPENSE
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.type !== "EXPENSE") {
      return NextResponse.json(
        { error: "Kategori tidak valid atau bukan kategori pengeluaran" },
        { status: 400 }
      );
    }

    // Upsert budget
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId: {
          userId: session.user.id,
          categoryId,
        },
      },
      update: {
        amount: numAmount,
      },
      create: {
        userId: session.user.id,
        categoryId,
        amount: numAmount,
        period: "MONTHLY",
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(budget, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/budgets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save budget" },
      { status: 500 }
    );
  }
}
