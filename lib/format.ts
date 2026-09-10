/**
 * Rupiah amount input helpers.
 *
 * Displayed amounts always use Indonesian conventions: "." as the thousand
 * separator and "," as the decimal separator (e.g. `1.250.000,50`). The
 * stored state of an amount input is the *formatted display string*; parse
 * it back with `parseAmountInput` before committing a transaction.
 */

/** Insert "." thousand separators into a digit string. */
function formatInteger(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Count "." characters in a string. */
function countDots(s: string): number {
  return (s.match(/\./g) || []).length;
}

/**
 * Format a raw amount as the user types. Both "." and "," are accepted as
 * the decimal separator.
 *
 * Deciding whether a "." is *decimal* (the fraction) or a *thousands*
 * separator is otherwise ambiguous from the string alone — "9.999" could be
 * 9999 (thousands) or 9.999 (decimal), and deleting a digit off "999.999.999"
 * produces "999.999.99" where the last "." is *not* a decimal. So callers
 * pass the previous formatted value: a "." counts as a decimal separator only
 * when it is a NEW dot the user just introduced (it wasn't in `prev`) with 0-2
 * digits after it. A "," is never a thousands separator, so it always starts
 * the fraction.
 *   "1500000"   -> "1.500.000"
 *   "9999"      -> "9.999"        (4th digit inserts a thousands ".")
 *   "9.9999"    -> "99.999"       (5th digit; the "." stays a thousands sep)
 *   "990.000"   -> "9.900.000"    (delete back: "99.000.0" stays integer too)
 *   "1250.5"    -> "1.250,5"      (NEW "." typed -> becomes a "," decimal)
 *   "1250,75"   -> "1.250,75"
 *
 * Decimals are capped at two places (rupiah never needs more).
 */
export function formatAmountInput(value: string, prev = ""): string {
  const s = value.replace(/[^\d.,-]/g, "");
  if (!s) return "";

  const negative = s.startsWith("-");
  const clean = negative ? s.slice(1) : s;
  if (!clean) return negative ? "-" : "";

  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  const prevDots = (prev.match(/\./g) || []).length;

  // Decide where the decimal separator sits (if anywhere).
  let decIndex: number;
  if (lastComma !== -1) {
    // A comma is never a thousands separator, so it unambiguously starts
    // the fraction — unless the user typed a "." after it, which wins.
    decIndex = Math.max(lastComma, lastDot);
  } else if (
    lastDot !== -1 &&
    (prev ? countDots(clean) > prevDots : true) &&
    clean.length - lastDot - 1 <= 2
  ) {
    // No comma yet: only a dot the user actively introduced counts as the
    // decimal. Dots carried over from earlier formatting (or left over after
    // a backspace, which could have ≤2 digits behind them) stay thousands.
    decIndex = lastDot;
  } else {
    decIndex = -1;
  }

  let formatted: string;
  if (decIndex === -1) {
    formatted = formatInteger(clean.replace(/[.,]/g, ""));
  } else {
    const intRaw = clean.slice(0, decIndex).replace(/[.,]/g, "");
    const decRaw = clean.slice(decIndex + 1).replace(/[.,]/g, "").slice(0, 2);
    formatted = `${formatInteger(intRaw)}${decRaw ? `,${decRaw}` : ","}`;
  }

  return negative ? `-${formatted}` : formatted;
}

/**
 * Parse a formatted display value back into a JS number.
 *   "1.250.000,50" -> 1250000.5
 */
export function parseAmountInput(value: string): number {
  if (!value.trim()) return NaN;
  const normalized = value
    .trim()
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const num = Number(normalized);
  return isFinite(num) ? num : NaN;
}

/**
 * Format a raw number (from a DB record, quick-preset, etc.) for
 * pre-filling an amount input. No currency symbol — that's the input's job.
 *   formatAmountNumber(1250000)   -> "1.250.000"
 *   formatAmountNumber(1250.5)    -> "1.250,5"
 */
export function formatAmountNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "";
  const hasDecimals = !Number.isInteger(n);
  const fixed = hasDecimals
    ? n.toFixed(2).replace(/0$/, "").replace(/\.$/, "")
    : String(Math.trunc(n));
  return formatAmountInput(fixed);
}