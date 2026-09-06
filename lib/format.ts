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

/**
 * Format a raw amount as the user types. Both "." and "," are accepted as
 * the decimal separator; the last one typed wins so pasting works too.
 *   "1500000"   -> "1.500.000"
 *   "1250.5"    -> "1.250,5"      (typed "." becomes a "," decimal)
 *   "1250,75"   -> "1.250,75"
 *
 * Decimals are capped at two places (rupiah never needs more).
 */
export function formatAmountInput(value: string): string {
  const s = value.replace(/[^\d.,-]/g, "");
  if (!s) return "";

  const negative = s.startsWith("-");
  const clean = negative ? s.slice(1) : s;
  if (!clean) return negative ? "-" : "";

  const lastDot = clean.lastIndexOf(".");
  const lastComma = clean.lastIndexOf(",");
  const decIndex = Math.max(lastDot, lastComma);

  let formatted: string;
  if (decIndex === -1) {
    formatted = formatInteger(clean);
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