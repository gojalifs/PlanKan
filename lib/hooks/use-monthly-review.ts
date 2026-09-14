"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Client-side mirror of the server's MonthlyStats (all JSON primitives). */
export interface MonthlyStatsClient {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
  netCashflow: number;
  savingsRate: number | null;
  movers: {
    up: {
      name: string;
      current: number;
      previous: number;
      pctChange: number | null;
    } | null;
    down: {
      name: string;
      current: number;
      previous: number;
      pctChange: number | null;
    } | null;
  };
  topExpenseName: string | null;
}

export interface MonthlyReviewData {
  month: number;
  year: number;
  stats: MonthlyStatsClient;
  conditionLabel: string | null;
  summary: string | null;
  suggestions: string[];
  source: "gemini" | "fallback";
  updatedAt: string;
}

export function useMonthlyReview(month?: number, year?: number) {
  const queryClient = useQueryClient();
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const query = useQuery<MonthlyReviewData>({
    queryKey: ["monthly-review", { month: m, year: y }],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-review?month=${m}&year=${y}`);
      if (!res.ok) throw new Error("Gagal memuat ulasan bulanan");
      return res.json();
    },
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/monthly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: m, year: y }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memperbarui ulasan bulanan");
      return result as MonthlyReviewData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-review"] });
      toast.success("Ulasan bulanan diperbarui!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    review: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isRegenerating: regenerate.isPending,
    regenerate: regenerate.mutateAsync,
  };
}