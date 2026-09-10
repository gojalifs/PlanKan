"use client";

import { useQuery } from "@tanstack/react-query";

export interface MonitoringAiDaily {
  date: string;
  calls: number;
  success: number;
  failed: number;
  costUsd: number;
}

export interface MonitoringAi {
  daily: MonitoringAiDaily[];
  total: { calls: number; successRate: number; costUsd: number };
  month: { calls: number; successRate: number; costUsd: number };
  recentFailures: Array<{
    model: string;
    statusCode: number | null;
    durationMs: number;
    errorMessage: string | null;
    createdAt: string;
  }>;
  days: number;
}

/** Format USD cost (e.g. "$0.18"). */
export function formatUsd(amount: number): string {
  if (amount == null || Number.isNaN(amount)) return "$0";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export function useMonitoringAi(days = 30) {
  return useQuery<MonitoringAi>({
    queryKey: ["monitoring", "ai", { days }],
    queryFn: async () => {
      const res = await fetch(`/api/monitoring/ai?days=${days}`);
      if (!res.ok) throw new Error("Gagal memuat data biaya AI");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}