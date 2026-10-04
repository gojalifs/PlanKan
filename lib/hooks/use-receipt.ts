"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showErrorToast } from "@/lib/quota-errors";
import { ReceiptUpload } from "@/lib/receipt";

/**
 * Receipt upload flow. `uploadReceipt` POSTs the image and returns the
 * receipt contract (temp image URL + line items). `deleteReceipt` removes
 * the temp file when the flow ends — silent, no toast: it is bookkeeping.
 */
export function useReceipt() {
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        const error = new Error(result.error || "Gagal mengunggah struk");
        (error as { code?: string }).code = result.code;
        throw error;
      }
      return result as ReceiptUpload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["receipt", data.id], data);
    },
    onError: (err: Error) => {
      showErrorToast(err, "Gagal mengunggah struk");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/receipts/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menghapus struk");
      return result;
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["receipt", id] });
    },
  });

  return {
    uploadReceipt: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteReceipt: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}