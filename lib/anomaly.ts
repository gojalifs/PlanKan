import { formatRupiah } from "@/lib/utils";

// ── Anomaly Detection ─────────────────────────────────────────────────────────
// Deterministic, statistical, stateless. No AI: a candidate expense is compared
// against its category's own recent historical amounts using a modified z-score
// (robust to outliers). Amounts are always plain numbers (from Decimal via Number()).

export const ANOMALY_WINDOW_DAYS = 90; // rolling baseline window (inclusive of today)
export const ANOMALY_MIN_SAMPLES = 5; // need this many prior samples before judging
export const ANOMALY_Z_THRESHOLD = 3.0; // modified z-score threshold
export const ANOMALY_ABS_FLOOR = 50_000; // ignore tiny amounts (< Rp 50k) entirely

/** Bucket key for transactions with no category (or no parent). */
export const UNCATEGORIZED_BUCKET = "__none__";
export const UNCATEGORIZED_LABEL = "Tanpa Kategori";

export interface ExpenseForAnomaly {
  /** Plain number amount (already `Number(Decimal)`) — never a Decimal/Date. */
  amount: number;
  /** Child category id (the id of the transaction's category row). */
  categoryId: string | null;
  /** Parent category id when the category has a parent, else its own id. */
  parentCategoryId: string | null;
  /** Display name: parent's name, else null for uncategorized. */
  parentCategoryName: string | null;
}

export interface AnomalyOptions {
  zThreshold?: number;
  absFloor?: number;
  minSamples?: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  reason: string | null;
  /** Median of the baseline amounts (excluding the candidate). */
  median: number;
  sampleCount: number;
  zScore: number | null;
}

/**
 * Resolve the anomaly bucket for one expense. Expenses aggregate at the parent
 * category level ("Kopi & Minuman" under "Makanan & Minuman"), so a coffee price
 * spike is compared against all coffee spending, not a single category.
 */
export function expenseAnomalyBucket(expense: {
  categoryId?: string | null;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
}): { key: string; name: string } {
  const id = expense.parentCategoryId ?? expense.categoryId;
  if (!id) return { key: UNCATEGORIZED_BUCKET, name: UNCATEGORIZED_LABEL };
  return { key: id, name: expense.parentCategoryName ?? UNCATEGORIZED_LABEL };
}

/** Group historical expenses into per-parent buckets, returning amounts + a display name. */
export function groupExpenseAmountsByParent(
  txns: ExpenseForAnomaly[],
): Map<string, { name: string; amounts: number[] }> {
  const buckets = new Map<string, { name: string; amounts: number[] }>();
  for (const t of txns) {
    const { key, name } = expenseAnomalyBucket(t);
    const existing = buckets.get(key);
    if (existing) {
      existing.amounts.push(t.amount);
    } else {
      buckets.set(key, { name, amounts: [t.amount] });
    }
  }
  return buckets;
}

/** Modified z-score (MAD-based). Falls back to a std-dev z-score when MAD = 0. */
function zScore(amount: number, samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];

  const deviations = sorted.map((s) => Math.abs(s - median));
  const mad = n % 2 === 0 ? (deviations[n / 2 - 1] + deviations[n / 2]) / 2 : deviations[(n - 1) / 2];

  if (mad > 0) return (0.6745 * (amount - median)) / Math.max(mad, 1);

  // MAD = 0: every sample was identical. Fall back to sample std-dev so the
  // candidate is judged against the spread that actually existed.
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  if (std > 0) return (amount - mean) / std;
  return 0;
}

function medianOf(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 0) return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return sorted[(n - 1) / 2];
}

/**
 * Judge one candidate expense against its category's baseline.
 * Guards (in order): baseline size, absolute floor. Returns a short Indonesian
 * reason string when flagged, e.g.
 *   "Pengeluaran tidak biasa: biasanya Kopi & Minuman sekitar Rp20.000, sekarang Rp75.000."
 */
export function detectAnomaly(
  candidate: ExpenseForAnomaly,
  historicalAmounts: number[],
  opts?: AnomalyOptions,
): AnomalyResult {
  const zThreshold = opts?.zThreshold ?? ANOMALY_Z_THRESHOLD;
  const absFloor = opts?.absFloor ?? ANOMALY_ABS_FLOOR;
  const minSamples = opts?.minSamples ?? ANOMALY_MIN_SAMPLES;

  const sorted = [...historicalAmounts].sort((a, b) => a - b);
  const median = medianOf(sorted);
  const sampleCount = sorted.length;

  if (sampleCount < minSamples || candidate.amount < absFloor) {
    return { isAnomaly: false, reason: null, median, sampleCount, zScore: null };
  }

  const z = zScore(candidate.amount, sorted);
  if (z < zThreshold) {
    return { isAnomaly: false, reason: null, median, sampleCount, zScore: z };
  }

  const { name } = expenseAnomalyBucket(candidate);
  const reason = `Pengeluaran tidak biasa: biasanya ${name} sekitar ${formatRupiah(
    median,
  )}, hari ini ${formatRupiah(candidate.amount)}.`;
  return { isAnomaly: true, reason, median, sampleCount, zScore: z };
}