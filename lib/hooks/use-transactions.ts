"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet } from "./use-wallets";
import { Category } from "./use-categories";

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  destinationWalletId: string | null;
  categoryId: string | null;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number | string;
  date: string;
  attachmentUrl?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  wallet?: Wallet;
  destinationWallet?: Wallet | null;
  category?: Category | null;
}

export interface TransactionFilters {
  walletId?: string;
  categoryId?: string;
  type?: "INCOME" | "EXPENSE" | "TRANSFER" | "ALL";
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useTransactions(filters?: TransactionFilters) {
  const queryClient = useQueryClient();

  const query = useQuery<{
    transactions: Transaction[];
    summary: {
      totalIncome: number;
      totalExpense: number;
      netCashflow: number;
    };
  }>({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.walletId && filters.walletId !== "ALL") params.set("walletId", filters.walletId);
      if (filters?.categoryId && filters.categoryId !== "ALL") params.set("categoryId", filters.categoryId);
      if (filters?.type && filters.type !== "ALL") params.set("type", filters.type);
      if (filters?.startDate) params.set("startDate", filters.startDate);
      if (filters?.endDate) params.set("endDate", filters.endDate);
      if (filters?.limit) params.set("limit", filters.limit.toString());

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat transaksi");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      silent,
      ...data
    }: {
      walletId: string;
      destinationWalletId?: string | null;
      categoryId?: string | null;
      type: "INCOME" | "EXPENSE" | "TRANSFER";
      amount: number;
      date?: string;
      note?: string | null;
      attachmentFile?: File | null;
      /** Skip the per-row success toast (multi-receipt saves). */
      silent?: boolean;
      /** Client-chosen key making saves idempotent: retries reuse it so the
       * server returns the already-created row instead of duplicating. */
      idempotencyKey?: string;
    }) => {
      // If there is a file, use multipart/form-data
      if (data.attachmentFile) {
        const formData = new FormData();
        formData.append('walletId', data.walletId);
        if (data.destinationWalletId) formData.append('destinationWalletId', data.destinationWalletId);
        if (data.categoryId) formData.append('categoryId', data.categoryId);
        formData.append('type', data.type);
        formData.append('amount', data.amount.toString());
        if (data.date) formData.append('date', data.date);
        if (data.note) formData.append('note', data.note);
        if (data.idempotencyKey) formData.append('idempotencyKey', data.idempotencyKey);
        formData.append('attachment', data.attachmentFile);
        const res = await fetch('/api/transactions', {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Gagal mencatat transaksi');
        return result.transaction;
      }
      // Fallback to JSON body
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal mencatat transaksi');
      return result.transaction;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      // Silent saves (multi-receipt rows) fire one toast at the end, not N.
      if ((variables as any).silent) return;
      toast.success("Transaksi berhasil dicatat!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      walletId?: string;
      destinationWalletId?: string | null;
      categoryId?: string | null;
      type?: "INCOME" | "EXPENSE" | "TRANSFER";
      amount?: number;
      date?: string;
      note?: string | null;
    }) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memperbarui transaksi");
      return result.transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Transaksi berhasil diperbarui!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus transaksi");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Transaksi berhasil dihapus!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    transactions: query.data?.transactions || [],
    summary: query.data?.summary || { totalIncome: 0, totalExpense: 0, netCashflow: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTransaction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTransaction: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
