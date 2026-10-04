import { applyWelcomeBonus, consume, refund } from "@/lib/usage";
import type { UsageStatus } from "@/lib/usage";

/**
 * Shared AI-quota gate for OCR & voice (monetise.md §11).
 *
 * Both features draw from the same monthly pool (`ocr.monthly_limit`) so a
 * subscription gives "N extractions" (receipts or voice, interchangeable).
 *
 * - `authorizeOcr()` claims a credit before the paid AI call; returns a 429
 *   verdict when the pool is empty.
 * - `finishOcr()` releases the credit (idempotent refund) if the call fails,
 *   so an error never silently burns quota.
 */
export interface OcrAuth {
  ok: true;
  refId?: string;
  usage: UsageStatus;
}

export interface OcrQuotaError {
  ok: false;
  code: "OCR_QUOTA_EXCEEDED";
  usage: UsageStatus;
}

export async function authorizeOcr(userId: string): Promise<OcrAuth | OcrQuotaError> {
  await applyWelcomeBonus(userId);
  const result = await consume(userId, "ocr");
  if (!result.ok) {
    return { ok: false, code: "OCR_QUOTA_EXCEEDED", usage: result.status };
  }
  return { ok: true, refId: result.refId, usage: result.status };
}

export async function finishOcr(
  userId: string,
  opts: { success: boolean; refId?: string }
): Promise<void> {
  if (!opts.success && opts.refId) {
    await refund(userId, "ocr", opts.refId);
  }
}

/** 429 payload shared by receipts & voice routes. */
export function ocrQuotaErrorBody(
  error: OcrQuotaError
): { error: string; code: "OCR_QUOTA_EXCEEDED"; usage: UsageStatus } {
  return {
    error: "Kuota OCR bulan ini sudah habis. Naikkan langgananmu atau tunggu bulan depan.",
    code: error.code,
    usage: error.usage,
  };
}