"use client";

import { useQuery } from "@tanstack/react-query";

export interface MonitoringAccess {
  canAccess: boolean;
}

/** Whether the signed-in user may view the monitoring page. */
export function useMonitoringAccess() {
  return useQuery<MonitoringAccess>({
    queryKey: ["monitoring", "access"],
    queryFn: async () => {
      const res = await fetch("/api/monitoring/access");
      if (!res.ok) throw new Error("Gagal memeriksa akses monitoring");
      return res.json();
    },
    retry: 1,
    staleTime: 5 * 60_000, // access list changes rarely
  });
}