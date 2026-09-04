"use client";

import { useQuery } from "@tanstack/react-query";

export interface ReportData {
  monthlyTrends: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
  categoryExpenses: Array<{
    name: string;
    color: string;
    icon: string;
    amount: number;
  }>;
  categoryIncomes: Array<{
    name: string;
    color: string;
    amount: number;
  }>;
  dailyExpenses: Array<{
    day: number;
    amount: number;
  }>;
  topSubCategories: Array<{
    name: string;
    color: string;
    parentName: string;
    amount: number;
  }>;
  summary: {
    income: number;
    expense: number;
    net: number;
  };
  selectedPeriod: {
    month: number;
    year: number;
    label: string;
  };
}

export function useReports(month?: number, year?: number) {
  const params = new URLSearchParams();
  if (month) params.set("month", month.toString());
  if (year) params.set("year", year.toString());

  return useQuery<ReportData>({
    queryKey: ["reports", month, year],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      return res.json();
    },
  });
}
