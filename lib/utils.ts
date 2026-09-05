import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number | string | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "Rp 0";
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateIndo(dateString: string | Date): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeIndo(dateString: string | Date): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Normalize a stored attachment URL into a same-origin path served by this app.
 *
 * New uploads are already stored as relative paths (`/transactions/<name>`).
 * Older rows still contain MinIO's internal host
 * (`http://plankan-minio:9000/transactions/<name>`), which the browser cannot
 * reach. In both cases we rebuild the same-origin path so the image is proxied
 * through `/transactions/[...path]`.
 */
export function normalizeAttachmentUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `/${parts.join("/")}`;
    }
  } catch {
    // Not a URL we can parse — fall back to the raw value.
  }
  return url;
}
