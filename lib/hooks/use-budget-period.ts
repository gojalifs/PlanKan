"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type BudgetPeriodMethod = "LAST_WORKING_DAY" | "FIXED_DAY";

export interface BudgetPeriodSetting {
  method: BudgetPeriodMethod;
  fixedDay: number | null;
}

export interface BudgetPeriodOverride {
  id: string;
  userId: string;
  month: number;
  year: number;
  startDay: number;
  createdAt: string;
  updatedAt: string;
}

// ── Task 1: Global Setting ────────────────────────────────────────────────────

export function useBudgetPeriodSetting() {
  const queryClient = useQueryClient();

  const query = useQuery<BudgetPeriodSetting>({
    queryKey: ["budget-period-setting"],
    queryFn: async () => {
      const res = await fetch("/api/budget-period/setting");
      if (!res.ok) throw new Error("Gagal memuat pengaturan periode budget");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BudgetPeriodSetting) => {
      const res = await fetch("/api/budget-period/setting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan pengaturan");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-period-setting"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Pengaturan periode budget disimpan!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    setting: query.data ?? { method: "LAST_WORKING_DAY" as BudgetPeriodMethod, fixedDay: null },
    isLoading: query.isLoading,
    updateSetting: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

// ── Task 2: Per-month Overrides ───────────────────────────────────────────────

export function useBudgetPeriodOverrides(month?: number, year?: number) {
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (month) params.set("month", String(month));
  if (year) params.set("year", String(year));

  const query = useQuery<BudgetPeriodOverride[]>({
    queryKey: ["budget-period-overrides", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/budget-period/overrides?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat override periode");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { month: number; year: number; startDay: number }) => {
      const res = await fetch("/api/budget-period/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan override");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-period-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Override periode budget disimpan!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      const res = await fetch(
        `/api/budget-period/overrides?month=${data.month}&year=${data.year}`,
        { method: "DELETE" }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus override");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-period-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Override periode dihapus, kembali ke pengaturan default!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  // The override for the currently-selected month (if any)
  const currentOverride =
    month && year
      ? (query.data || []).find((o) => o.month === month && o.year === year) ?? null
      : null;

  return {
    overrides: query.data || [],
    currentOverride,
    isLoading: query.isLoading,
    saveOverride: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteOverride: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
