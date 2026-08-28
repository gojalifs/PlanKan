"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "./use-wallets";
import { Transaction } from "./use-transactions";

export interface SummaryData {
  totalNetWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netCashflow: number;
  wallets: Wallet[];
  recentTransactions: Transaction[];
  categoryExpenses: Array<{
    name: string;
    color: string;
    amount: number;
  }>;
}

export function useSummary() {
  return useQuery<SummaryData>({
    queryKey: ["summary"],
    queryFn: async () => {
      const res = await fetch("/api/summary");
      if (!res.ok) throw new Error("Gagal memuat ringkasan dashboard");
      return res.json();
    },
  });
}
