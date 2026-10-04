"use client";

import { useQuery } from "@tanstack/react-query";

export interface MeUsage {
  plan: { key: string; name: string };
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  entitlements: Record<string, string | number | boolean | null>;
  usage: {
    ocr: {
      feature: string;
      period: string;
      used: number;
      limit: number | null;
      bonus: number;
      remaining: number | null;
    };
    wallets: { used: number; limit: number | null };
    budgets: { used: number; limit: number | null };
  };
}

/**
 * Current plan + live quota snapshot for the signed-in user. Powers the header
 * plan badge and any "OCR tersisa" hints. Refetched on window focus so a
 * counter shown in one tab updates when a receipt is scanned in another.
 */
export function useMeUsage() {
  return useQuery<MeUsage>({
    queryKey: ["me-usage"],
    queryFn: async () => {
      const res = await fetch("/api/me/usage");
      if (!res.ok) throw new Error("Gagal memuat status langganan");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}