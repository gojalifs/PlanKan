"use client";

import { useQuery } from "@tanstack/react-query";

export interface MonitoringOverview {
  api: {
    requests7d: number;
    errorCount: number;
    errorRate: number;
    avgMs: number;
    p95Ms: number;
    p99Ms: number;
  };
  gemini: {
    today: { calls: number; successRate: number; costUsd: number };
    month: { calls: number; successRate: number; costUsd: number };
  };
  recentErrors: Array<{
    route: string;
    method: string;
    status: number;
    error: string | null;
    createdAt: string;
  }>;
}

export function useMonitoringOverview() {
  return useQuery<MonitoringOverview>({
    queryKey: ["monitoring", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/monitoring/overview");
      if (!res.ok) throw new Error("Gagal memuat monitoring overview");
      return res.json();
    },
    refetchInterval: 60_000, // refetch every minute
  });
}