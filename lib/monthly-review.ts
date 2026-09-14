import { prisma } from "@/lib/prisma";
import { resolveBudgetPeriod } from "@/lib/budget-period";
import { formatRupiah } from "@/lib/utils";

// ── AI Monthly Review: deterministic stats ────────────────────────────────────
// Everything a number on the review card shows is computed HERE, deterministically,
// from the user's own transactions over budget-period windows. AI (lib/ai-review.ts)
// never invents a figure — it only writes qualitative summary/suggestions prose.

export interface PeriodBudgetTx {
  type: "INCOME" | "EXPENSE";
  amount: number;
  /** Parent category name, else the category's own name, else null (uncategorized). */
  categoryParentName: string | null;
}

export interface CategoryMovement {
  name: string;
  current: number;
  previous: number;
  /** Percentage change vs previous period; null when previous === 0. */
  pctChange: number | null;
}

export interface MonthlyStats {
  month: number;
  year: number;
  /** Resolved budget-period label, e.g. "26 Agu – 30 Sep 2026" */
  label: string;
  income: number;
  expense: number;
  netCashflow: number;
  /** netCashflow / income; null when income is 0. */
  savingsRate: number | null;
  movers: {
    /** Expense category with the largest % increase (previous > 0), or null. */
    up: CategoryMovement | null;
    /** Expense category with the largest % decrease, or null. */
    down: CategoryMovement | null;
  };
  topExpenseName: string | null;
}

export interface Condition {
  emoji: string;
  label: string;
}

/** Map an expense to its parent display name (mirrors reports aggregation). */
function parentNameOf(t: {
  category?: { parent?: { name: string } | null; name: string } | null;
}): string | null {
  return t.category?.parent?.name ?? t.category?.name ?? null;
}

function aggregateByParent(txns: PeriodBudgetTx[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "EXPENSE") continue;
    const name = t.categoryParentName ?? "Tanpa Kategori";
    map.set(name, (map.get(name) ?? 0) + t.amount);
  }
  return map;
}

/** Pure: compute stats from two budget periods' transactions. */
export function computeMonthlyStats(
  current: PeriodBudgetTx[],
  previous: PeriodBudgetTx[],
  identity: { month: number; year: number; label: string },
): MonthlyStats {
  const income = current.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = current.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const netCashflow = income - expense;
  const savingsRate = income > 0 ? netCashflow / income : null;

  const curByParent = aggregateByParent(current);
  const prevByParent = aggregateByParent(previous);

  const names = new Set([...curByParent.keys(), ...prevByParent.keys()]);
  const movements: CategoryMovement[] = [];
  for (const name of names) {
    const cur = curByParent.get(name) ?? 0;
    const prev = prevByParent.get(name) ?? 0;
    movements.push({
      name,
      current: cur,
      previous: prev,
      pctChange: prev > 0 ? ((cur - prev) / prev) * 100 : null,
    });
  }

  // Mover pick: only compare periods that actually had prior spend, so a brand
  // new category (prev = 0) doesn't produce an infinite "% naik".
  const comparable = movements.filter((m) => m.previous > 0 && m.pctChange !== null);
  const up = comparable.length > 0
    ? comparable.reduce((a, b) => (b.pctChange! > a.pctChange! ? b : a))
    : null;
  const down = comparable.length > 0
    ? comparable.reduce((a, b) => (b.pctChange! < a.pctChange! ? b : a))
    : null;

  const topExpenseName =
    movements.length > 0
      ? movements.reduce((a, b) => (b.current > a.current ? b : a)).name
      : null;

  return {
    month: identity.month,
    year: identity.year,
    label: identity.label,
    income,
    expense,
    netCashflow,
    savingsRate,
    movers: { up, down },
    topExpenseName,
  };
}

/** Deterministic condition badge, e.g. { emoji: "🟢", label: "Bagus" }. */
export function conditionFromStats(stats: MonthlyStats): Condition {
  if (stats.income === 0 && stats.expense > 0) return { emoji: "🔴", label: "Kritis" };
  if (stats.netCashflow >= 0) return { emoji: "🟢", label: "Bagus" };
  if (stats.savingsRate !== null && stats.savingsRate >= -0.1) {
    return { emoji: "🟡", label: "Perlu Perhatian" };
  }
  return { emoji: "🔴", label: "Kritis" };
}

/** Indonesian heuristic suggestions used when Gemini is unavailable or fails. */
export function buildFallbackSuggestions(stats: MonthlyStats): string[] {
  const suggestions: string[] = [];

  if (stats.netCashflow < 0) {
    suggestions.push(
      `Periode ini terjadi defisit ${formatRupiah(Math.abs(stats.netCashflow))}. Coba kurangi pengeluaran ${
        stats.topExpenseName ?? "terbesar"
      } agar arus kas kembali positif.`,
    );
  }

  const up = stats.movers.up;
  if (up && up.pctChange !== null) {
    suggestions.push(
      `Pengeluaran ${up.name} naik ${Math.abs(up.pctChange).toFixed(0)}% dibanding periode sebelumnya. Tinjau kembali anggaran ${up.name} untuk bulan depan.`,
    );
  }

  const down = stats.movers.down;
  if (down && down.pctChange !== null) {
    suggestions.push(
      `Bagus! Pengeluaran ${down.name} turun ${Math.abs(down.pctChange).toFixed(0)}%. Pertahankan efektivitas ini.`,
    );
  }

  if (stats.savingsRate !== null && stats.savingsRate >= 0.2) {
    suggestions.push(
      `Tingkat menabung Anda sehat: ${(stats.savingsRate * 100).toFixed(0)}% dari pemasukan. Pertimbangkan menambah alokasi investasi.`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Lanjutkan mencatat transaksi secara rutin agar rekomendasi bulan berikutnya semakin akurat.",
    );
  }

  return suggestions;
}

function prevIdentity(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

/**
 * Fetch both budget periods and compute the deterministic stats snapshot.
 * "September 2026" here means the September BUDGET period (which may start
 * mid-August), per the user's period setting / override.
 */
export async function fetchMonthlyStats(
  userId: string,
  month: number,
  year: number,
): Promise<MonthlyStats> {
  const prev = prevIdentity(month, year);

  const [setting, overrideCur, overridePrev] = await Promise.all([
    prisma.budgetPeriodSetting.findUnique({ where: { userId } }),
    prisma.budgetPeriodOverride.findUnique({
      where: { userId_month_year: { userId, month, year } },
    }),
    prisma.budgetPeriodOverride.findUnique({
      where: { userId_month_year: { userId, month: prev.month, year: prev.year } },
    }),
  ]);

  const cur = resolveBudgetPeriod(month, year, overrideCur, setting);
  const prevPeriod = resolveBudgetPeriod(prev.month, prev.year, overridePrev, setting);

  const [curTxns, prevTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] },
        date: { gte: cur.startDate, lte: cur.endDate },
      },
      select: {
        type: true,
        amount: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] },
        date: { gte: prevPeriod.startDate, lte: prevPeriod.endDate },
      },
      select: {
        type: true,
        amount: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
      },
    }),
  ]);

  const toBudgetTx = (rows: typeof curTxns): PeriodBudgetTx[] =>
    rows.map((t) => ({
      // Query restricts type to INCOME/EXPENSE, so narrowing is safe here.
      type: t.type === "INCOME" ? "INCOME" : "EXPENSE",
      amount: Number(t.amount),
      categoryParentName: t.category?.parent?.name ?? t.category?.name ?? null,
    }));

  return computeMonthlyStats(toBudgetTx(curTxns), toBudgetTx(prevTxns), {
    month,
    year,
    label: cur.label,
  });
}