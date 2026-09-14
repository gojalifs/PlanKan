"use client";

import { motion, type Variants } from "framer-motion";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMonthlyReview,
  type MonthlyStatsClient,
} from "@/lib/hooks/use-monthly-review";
import { formatRupiah } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function Skeleton() {
  return (
    <motion.div variants={itemVariants}>
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-48 rounded bg-muted animate-pulse mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Perubahan({ movers }: { movers: MonthlyStatsClient["movers"] }) {
  const hasAny = movers.up || movers.down;
  if (!hasAny) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Perubahan vs Periode Lalu
      </p>
      <div className="space-y-1">
        {movers.up && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="text-foreground">
              <span className="font-medium">{movers.up.name}</span>{" "}
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                naik {Math.abs(movers.up.pctChange!).toFixed(0)}%
              </span>
            </span>
          </div>
        )}
        {movers.down && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-foreground">
              <span className="font-medium">{movers.down.name}</span>{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                turun {Math.abs(movers.down.pctChange!).toFixed(0)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MonthlyReviewCardProps {
  month?: number;
  year?: number;
  /** When true, renders the card with wider layout (for /reports). */
  fullWidth?: boolean;
}

export function MonthlyReviewCard({ month, year, fullWidth }: MonthlyReviewCardProps) {
  const { review, isLoading, isRegenerating, regenerate } = useMonthlyReview(month, year);

  if (isLoading) return <Skeleton />;
  if (!review) return null;

  const { stats, conditionLabel, summary, suggestions, source } = review;
  const isZero = stats.income === 0 && stats.expense === 0;

  return (
    <motion.div variants={itemVariants} className={fullWidth ? "w-full" : undefined}>
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Ulasan Bulanan</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.label}</p>
            </div>
            <div className="flex items-center gap-2">
              {conditionLabel && (
                <Badge variant="default" className="text-xs whitespace-nowrap">
                  {conditionLabel}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => regenerate()}
                disabled={isRegenerating}
                title="Muat ulang ulasan AI"
              >
                {isRegenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="sr-only">Regenerate</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isZero ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada data untuk periode ini.
            </p>
          ) : (
            <>
              {/* Cashflow */}
              <div className="rounded-lg border border-border bg-muted/30 dark:bg-muted/20 px-3.5 py-3">
                <p className="text-xs text-muted-foreground mb-1">Arus Kas Bersih</p>
                <p
                  className={`text-xl font-extrabold tracking-tight ${
                    stats.netCashflow >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {stats.netCashflow >= 0 ? "+" : ""}
                  {formatRupiah(stats.netCashflow)}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                  <span>
                    Pemasukan {formatRupiah(stats.income)}
                  </span>
                  <span>
                    Pengeluaran {formatRupiah(stats.expense)}
                  </span>
                </div>
              </div>

              <Perubahan movers={stats.movers} />

              {/* AI summary / suggestions */}
              {(summary || suggestions.length > 0) && (
                <div className="space-y-2 pt-1 border-t border-border/70">
                  <div className="flex items-center gap-1.5">
                    {source === "gemini" ? (
                      <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <span className="h-3.5 w-3.5 inline-block" />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Saran
                    </p>
                    {source === "fallback" && (
                      <span className="text-[10px] text-muted-foreground italic ml-auto">
                        Saran otomatis (tanpa AI)
                      </span>
                    )}
                  </div>
                  {summary && (
                    <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                  )}
                  {suggestions.length > 0 && (
                    <ul className="space-y-1.5 list-disc list-inside text-sm text-foreground/90">
                      {suggestions.map((s, i) => (
                        <li key={i} className="leading-relaxed">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}