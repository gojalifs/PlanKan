"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/quota-errors";

export interface GoalWallet {
  id: string;
  name: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remaining: number;
  percent: number;
  targetDate: string | null;
  walletId: string | null;
  color: string;
  icon: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  wallet: GoalWallet | null;
}

export interface FinancialGoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
  walletId?: string | null;
  color?: string;
}

export interface GoalsSummary {
  totalTarget: number;
  totalSaved: number;
  activeCount: number;
}

export function useGoals() {
  const queryClient = useQueryClient();

  const query = useQuery<{ goals: FinancialGoal[]; summary: GoalsSummary }>({
    queryKey: ["goals"],
    queryFn: async () => {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Gagal memuat daftar tujuan");
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: FinancialGoalInput) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        const error = new Error(result.error || "Gagal membuat tujuan");
        (error as { code?: string }).code = result.code;
        throw error;
      }
      return result.goal as FinancialGoal;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tujuan berhasil dibuat!");
    },
    onError: (err: Error) => {
      showErrorToast(err, "Gagal membuat tujuan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FinancialGoalInput>) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        const error = new Error(result.error || "Gagal memperbarui tujuan");
        (error as { code?: string }).code = result.code;
        throw error;
      }
      return result.goal as FinancialGoal;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tujuan berhasil diperbarui!");
    },
    onError: (err: Error) => {
      showErrorToast(err, "Gagal memperbarui tujuan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) {
        const error = new Error(result.error || "Gagal menghapus tujuan");
        (error as { code?: string }).code = result.code;
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tujuan berhasil dihapus!");
    },
    onError: (err: Error) => {
      showErrorToast(err, "Gagal menghapus tujuan");
    },
  });

  return {
    goals: query.data?.goals || [],
    summary: query.data?.summary || { totalTarget: 0, totalSaved: 0, activeCount: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createGoal: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateGoal: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteGoal: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}