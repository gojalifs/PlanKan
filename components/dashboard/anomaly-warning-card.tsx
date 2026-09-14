"use client";

import { motion, type Variants } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSummary } from "@/lib/hooks/use-summary";
import { formatRupiah } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/**
 * Dashboard warning card listing recent anomalies detected against the user's
 * own spending patterns. Reads `useSummary().recentAnomalies` (recomputed
 * read-time over the 90-day rolling window); renders nothing when empty.
 */
export function AnomalyWarningCard() {
  const { data: summary } = useSummary();
  const anomalies = summary?.recentAnomalies ?? [];

  if (anomalies.length === 0) return null;

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 shadow-xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Pengeluaran Tidak Biasa
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
                  Pengeluaran ini menyimpang dari pola Anda
                </p>
              </div>
            </div>
            <Badge variant="warning" className="text-[10px]">
              {anomalies.length} indikasi
            </Badge>
          </div>

          <div className="mt-4 space-y-2.5">
            {anomalies.map((a) => (
              <div
                key={a.transactionId}
                className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-white/70 dark:border-amber-500/20 dark:bg-background/60 px-3 py-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 mt-0.5">
                  <AlertTriangle className="h-3 w-3" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">
                    {a.reason}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatRupiah(a.amount)} · biasanya {formatRupiah(a.median)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/transactions"
            className="group mt-4 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
          >
            Lihat transaksi
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}