"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: "CASH" | "BANK" | "E_WALLET" | "INVESTMENT" | "SAVINGS" | "OTHER";
  balance: number | string;
  currency: string;
  color: string;
  icon: string;
  isExcludedFromTotal: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
    transfersIn: number;
  };
}

export function useWallets() {
  const queryClient = useQueryClient();

  const query = useQuery<{ wallets: Wallet[]; totalBalance: number }>({
    queryKey: ["wallets"],
    queryFn: async () => {
      const res = await fetch("/api/wallets");
      if (!res.ok) throw new Error("Gagal memuat daftar dompet");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      type: string;
      balance: number;
      currency?: string;
      color?: string;
      icon?: string;
      isExcludedFromTotal?: boolean;
    }) => {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal membuat dompet");
      return result.wallet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Dompet berhasil ditambahkan!");
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
      name?: string;
      type?: string;
      balance?: number;
      color?: string;
      icon?: string;
      isExcludedFromTotal?: boolean;
    }) => {
      const res = await fetch(`/api/wallets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memperbarui dompet");
      return result.wallet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success("Dompet berhasil diperbarui!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/wallets/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus dompet");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Dompet berhasil dihapus!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    wallets: query.data?.wallets || [],
    totalBalance: query.data?.totalBalance || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createWallet: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateWallet: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteWallet: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
