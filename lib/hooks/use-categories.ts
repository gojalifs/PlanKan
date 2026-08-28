"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
  };
}

export function useCategories(type?: "INCOME" | "EXPENSE") {
  const queryClient = useQueryClient();

  const query = useQuery<{ categories: Category[] }>({
    queryKey: ["categories", { type }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/categories?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat daftar kategori");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      type: "INCOME" | "EXPENSE";
      icon?: string;
      color?: string;
    }) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal membuat kategori");
      return result.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil ditambahkan!");
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
      type?: "INCOME" | "EXPENSE";
      icon?: string;
      color?: string;
    }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memperbarui kategori");
      return result.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil diperbarui!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus kategori");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategori berhasil dihapus!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    categories: query.data?.categories || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createCategory: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCategory: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCategory: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
