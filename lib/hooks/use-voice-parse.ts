"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { VoiceDraft } from "@/lib/voice-types";

/**
 * Voice parse step: sends the spoken/typed phrase to /api/voice and returns
 * the resolved draft (names → ids done server-side, so the dialog never sees
 * raw model output). The dialog calls `parseVoice(...).catch(() => {})` —
 * react-query v5 runs `onError` (the toast) even when mutateAsync rejects,
 * so catching in the caller prevents a duplicate.
 */
export function useVoiceParse() {
  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memahami ucapan");
      return result as { draft: VoiceDraft };
    },
    onError: (err: Error) => {
      toast.error(err.message || "Terjadi kesalahan");
    },
  });

  return {
    parseVoice: mutation.mutateAsync,
    isParsing: mutation.isPending,
    error: mutation.error,
  };
}