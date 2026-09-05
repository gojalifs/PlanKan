"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SubBudgetItem {
  id: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  parentId: string;
  parentName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  hasBudget: boolean;
  updatedAt: string | null;
}

export interface BudgetItem {
  id: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  parentId: string | null;
  directBudgetAmount: number;
  subBudgetsTotal: number;
  budgetAmount: number;
  directSpentAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  hasBudget: boolean;
  hasDirectBudget: boolean;
  subCategories: SubBudgetItem[];
  updatedAt: string | null;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpentInBudgetedCategories: number;
  totalOverallExpense: number;
  remainingBudget: number;
  overallPercentage: number;
  budgetCount: number;
  overbudgetCount: number;
}

export interface BudgetsResponse {
  month: number;
  year: number;
  periodLabel: string;
  isOverridden: boolean;
  summary: BudgetSummary;
  items: BudgetItem[];
}

export function useBudgets(month?: number, year?: number) {
  const queryClient = useQueryClient();

  const now = new Date();
  const currentMonth = month ?? now.getMonth() + 1;
  const currentYear = year ?? now.getFullYear();

  const query = useQuery<BudgetsResponse>({
    queryKey: ["budgets", { month: currentMonth, year: currentYear }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("month", String(currentMonth));
      params.set("year", String(currentYear));
      const res = await fetch(`/api/budgets?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data anggaran/budget");
      return res.json();
    },
  });

  const saveBudgetMutation = useMutation({
    mutationFn: async (data: {
      categoryId: string;
      amount: number;
    }) => {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan budget");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Anggaran budget berhasil disimpan!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan budget");
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus budget");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Anggaran budget berhasil dihapus!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan saat menghapus budget");
    },
  });

  return {
    data: query.data,
    items: query.data?.items || [],
    summary: query.data?.summary || {
      totalBudgeted: 0,
      totalSpentInBudgetedCategories: 0,
      totalOverallExpense: 0,
      remainingBudget: 0,
      overallPercentage: 0,
      budgetCount: 0,
      overbudgetCount: 0,
    },
    month: currentMonth,
    year: currentYear,
    periodLabel: query.data?.periodLabel || "",
    isOverridden: query.data?.isOverridden || false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    saveBudget: saveBudgetMutation.mutateAsync,
    isSaving: saveBudgetMutation.isPending,
    deleteBudget: deleteBudgetMutation.mutateAsync,
    isDeleting: deleteBudgetMutation.isPending,
  };
}
