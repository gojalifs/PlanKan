"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeUsage } from "@/lib/hooks/use-me-usage";

const TIER_STYLES: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700 border-slate-200",
  STARTER: "bg-sky-50 text-sky-700 border-sky-200",
  PLUS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PRO: "bg-amber-50 text-amber-700 border-amber-200",
  FAMILY: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function ocrBadge(used: number, limit: number | null, bonus: number) {
  if (limit === null) return "∞";
  const total = limit + bonus;
  if (used >= total) return `${used}/${total} · habis`;
  return `${used}/${total}`;
}

/**
 * Navbar pill: current plan name + shared OCR/voice quota remaining.
 * Clicking it opens /pricing.
 */
export function PlanBadge() {
  const { data, isLoading } = useMeUsage();

  if (isLoading) {
    return <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />;
  }

  const planKey = data?.plan.key ?? "FREE";
  const usage = data?.usage.ocr;
  const style = TIER_STYLES[planKey] ?? TIER_STYLES.FREE;

  return (
    <Link
      href="/pricing"
      title="Status paket & kuota"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80",
        style
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{data?.plan.name ?? "Free"}</span>
      {usage && (
        <span className="font-medium opacity-80">
          {ocrBadge(usage.used, usage.limit, usage.bonus)}
        </span>
      )}
    </Link>
  );
}