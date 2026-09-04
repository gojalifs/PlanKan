/**
 * Budget Period Utilities
 *
 * Resolves the effective [startDate, endDate) for a given budget month/year,
 * considering:
 *  1. Per-month override (BudgetPeriodOverride)
 *  2. User global setting (BudgetPeriodSetting)
 *  3. Hardcoded default: last working day (Mon–Fri) of the previous calendar month
 *
 * Convention:
 *  - Budget for month M / year Y starts on some day in (M-1)'s calendar month.
 *  - Budget ends on the day BEFORE the next budget start date
 *    (i.e. endDate = nextBudgetStart - 1 day, at 23:59:59.999).
 */

export type BudgetPeriodMethod = "LAST_WORKING_DAY" | "FIXED_DAY";

export interface ResolvedBudgetPeriod {
  /** Inclusive start datetime of the budget period */
  startDate: Date;
  /** Inclusive end datetime of the budget period (23:59:59.999) */
  endDate: Date;
  /** Human-readable label, e.g. "26 Jun – 31 Jul 2026" */
  label: string;
  /** The day-of-month that this budget period starts on (in the prev calendar month) */
  startDay: number;
  /** Was this period determined by an override? */
  isOverridden: boolean;
}

/**
 * Returns the last working day (Mon–Fri) of the given month/year.
 * @param year  Calendar year
 * @param month 1-indexed calendar month
 */
export function lastWorkingDayOf(year: number, month: number): number {
  const lastDay = new Date(year, month, 0); // last calendar day of month
  const dow = lastDay.getDay(); // 0=Sun, 6=Sat
  if (dow === 0) return lastDay.getDate() - 2; // Sun → Fri
  if (dow === 6) return lastDay.getDate() - 1; // Sat → Fri
  return lastDay.getDate();
}

/**
 * Resolve the calendar month that PRECEDES the budget month.
 * Budget month M/Y → prev month = (M-1)/Y or 12/(Y-1) when M=1
 */
function prevCalMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

/**
 * Given an optional override row and an optional setting row, compute the
 * effective start date for budget month `budgetMonth`/`budgetYear`.
 *
 * @param budgetMonth   1-indexed budget month (e.g. 8 = August)
 * @param budgetYear    Budget year (e.g. 2026)
 * @param override      Row from BudgetPeriodOverride (or null/undefined)
 * @param setting       Row from BudgetPeriodSetting  (or null/undefined)
 */
export function resolveBudgetPeriod(
  budgetMonth: number,
  budgetYear: number,
  override?: { startDay: number } | null,
  setting?: { method: string; fixedDay?: number | null } | null
): ResolvedBudgetPeriod {
  const prev = prevCalMonth(budgetMonth, budgetYear);
  let startDay: number;
  let isOverridden = false;

  if (override?.startDay != null) {
    // Task 2: explicit override wins
    startDay = override.startDay;
    isOverridden = true;
  } else if (setting?.method === "FIXED_DAY" && setting.fixedDay != null) {
    // Task 1: user chose fixed day
    startDay = setting.fixedDay;
  } else {
    // Default: last working day of previous calendar month
    startDay = lastWorkingDayOf(prev.year, prev.month);
  }

  const startDate = new Date(prev.year, prev.month - 1, startDay, 0, 0, 0, 0);

  // End: day before next budget period starts
  // Compute next period's start as well
  const nextBudget = budgetMonth === 12
    ? { month: 1, year: budgetYear + 1 }
    : { month: budgetMonth + 1, year: budgetYear };

  const nextPrev = prevCalMonth(nextBudget.month, nextBudget.year);
  const nextStartDay = lastWorkingDayOf(nextPrev.year, nextPrev.month);
  const nextStartDate = new Date(nextPrev.year, nextPrev.month - 1, nextStartDay, 0, 0, 0, 0);

  // End = one millisecond before next start
  const endDate = new Date(nextStartDate.getTime() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const label = `${fmt(startDate)} – ${fmt(endDate)}`;

  return { startDate, endDate, label, startDay, isOverridden };
}
