/**
 * Shared confidence-score types + helpers for AI outputs (receipt OCR,
 * voice parsing). Client-safe: no `process.env`, no prisma — both the
 * `"use client"` dialogs and the server-side parse modules import this.
 *
 * Gemini is asked to return a per-field confidence 0..1 alongside the values
 * it extracts. `normalizeConfidence()` is the single defensive boundary every
 * raw model value passes through: it clamps to [0,1] and turns anything that
 * is not a finite number into `null` so the UI can safely hide the badge.
 */

/** Per-field confidence for one receipt OCR line item (null = not reported). */
export interface ReceiptItemConfidence {
  name: number | null;
  qty: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  /** Confidence in the category suggestion; null when none was suggested. */
  category: number | null;
}

/** Per-field confidence for a voice-parsed draft (null = not reported). */
export interface VoiceConfidence {
  type: number | null;
  amount: number | null;
  /** Confidence the spoken wallet name was understood correctly. */
  wallet: number | null;
  /** Confidence the spoken category suggestion was understood correctly. */
  category: number | null;
  date: number | null;
  note: number | null;
}

export type ConfidenceLevel = "high" | "medium" | "low";

const HIGH = 0.8;
const MEDIUM = 0.5;

/** Clamp a raw model value to [0,1]; anything non-finite becomes null. */
export function normalizeConfidence(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return null;
}

/** Read one field out of an arbitrary sub-object and normalize it. */
function pickConfidence(
  raw: unknown,
  key: string
): number | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return obj ? normalizeConfidence(obj[key]) : null;
}

/** Extract + normalize the OCR item confidence object Gemini returned. */
export function normalizeReceiptConfidence(raw: unknown): ReceiptItemConfidence {
  return {
    name: pickConfidence(raw, "name"),
    qty: pickConfidence(raw, "qty"),
    unitPrice: pickConfidence(raw, "unitPrice"),
    lineTotal: pickConfidence(raw, "lineTotal"),
    category: pickConfidence(raw, "category"),
  };
}

/** Extract + normalize the voice-draft confidence object Gemini returned. */
export function normalizeVoiceConfidence(raw: unknown): VoiceConfidence {
  return {
    type: pickConfidence(raw, "type"),
    amount: pickConfidence(raw, "amount"),
    wallet: pickConfidence(raw, "wallet"),
    category: pickConfidence(raw, "category"),
    date: pickConfidence(raw, "date"),
    note: pickConfidence(raw, "note"),
  };
}

/** "84" for 0.84, or null when no confidence to show (UI appends the % sign). */
export function confidencePercent(value: number | null | undefined): string | null {
  if (value == null) return null;
  return String(Math.round(value * 100));
}

/** Styling bucket for a confidence value, or null when there is none. */
export function confidenceLevel(
  value: number | null | undefined
): ConfidenceLevel | null {
  if (value == null) return null;
  if (value >= HIGH) return "high";
  if (value >= MEDIUM) return "medium";
  return "low";
}