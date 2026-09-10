"use client";

import { useQuery } from "@tanstack/react-query";

export interface MonitoringRouteStats {
  method: string;
  route: string;
  count: number;
  errorCount: number;
  avgMs: number;
  p95: number;
  p99: number;
}

export function useMonitoringRequests(days = 7) {
  return useQuery<{ routes: MonitoringRouteStats[]; days: number }>({
    queryKey: ["monitoring", "requests", { days }],
    queryFn: async () => {
      const res = await fetch(`/api/monitoring/requests?days=${days}`);
      if (!res.ok) throw new Error("Gagal memuat statistik request");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}