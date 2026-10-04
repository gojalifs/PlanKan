"use client";

import { toast } from "sonner";

export type MonetizationErrorCode =
  | "OCR_QUOTA_EXCEEDED"
  | "WALLET_LIMIT_REACHED"
  | "BUDGET_LIMIT_REACHED"
  | "FINANCIAL_GOALS_REQUIRED";

/**
 * Feedback for API mutations. Quota/limit rejections get a visible call-to-
 * action pointing at /pricing so the user knows how to unlock more.
 */
export function showErrorToast(err: unknown, fallback = "Terjadi kesalahan") {
  const e = err as { message?: string; code?: string } | undefined;
  const message = e?.message || fallback;
  const code = e?.code as MonetizationErrorCode | undefined;

  if (
    code === "OCR_QUOTA_EXCEEDED" ||
    code === "WALLET_LIMIT_REACHED" ||
    code === "BUDGET_LIMIT_REACHED" ||
    code === "FINANCIAL_GOALS_REQUIRED"
  ) {
    toast.error(message, {
      action: {
        label: "Lihat Paket",
        onClick: () => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- helper module (no router context)
          window.location.href = "/pricing";
        },
      },
    });
    return;
  }

  toast.error(message);
}