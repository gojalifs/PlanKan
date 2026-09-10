"use client";

import { motion, Variants } from "framer-motion";
import { Activity, ShieldAlert } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMonitoringAccess } from "@/lib/hooks/use-monitoring-access";
import { useMonitoringOverview } from "@/lib/hooks/use-monitoring-overview";
import { useMonitoringRequests } from "@/lib/hooks/use-monitoring-requests";
import { useMonitoringAi } from "@/lib/hooks/use-monitoring-ai";
import { OverviewCards } from "@/components/monitoring/overview-cards";
import { RoutePerformanceTable } from "@/components/monitoring/route-performance-table";
import { ErrorFeed } from "@/components/monitoring/error-feed";
import { AiCostChart } from "@/components/monitoring/ai-cost-chart";
import { AiRecentFailures } from "@/components/monitoring/ai-failures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

// ─── Animation variants ───────────────────────────────────────────────────────
const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-muted ${className ?? ""}`} />
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const router = useRouter();
  const session = useSession();
  const { data: monitoringAccess, status: accessStatus } = useMonitoringAccess();

  const { data: overview, isLoading: loadingOverview } = useMonitoringOverview();
  const { data: requests, isLoading: loadingRequests } = useMonitoringRequests(7);
  const { data: ai, isLoading: loadingAi } = useMonitoringAi(30);

  const isLoading = loadingOverview || loadingRequests || loadingAi;

  // Gate: monitoring only for signed-in users
  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace("/login");
    }
  }, [session.isPending, session.data, router]);

  if (session.isPending) {
    return <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => <Skeleton key={i} className="h-80" />)}
      </div>
    </div>;
  }

  if (!session.data?.user) return null;

  // ── Admin only: wait for the access check, fail closed on error ──
  if (accessStatus === "pending") {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-72 mx-auto" />
      </div>
    );
  }

  if (accessStatus === "error" || monitoringAccess?.canAccess === false) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="max-w-md w-full border-border text-center py-10 px-6">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold">Akses ditolak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Halaman Monitoring hanya untuk admin. Hubungi pemilik aplikasi jika
            Anda membutuhkan akses.
          </p>
        </Card>
      </div>
    );
  }

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80" />)}
        </div>
      </div>
    );
  }

  if (!overview || !requests || !ai) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Gagal memuat data monitoring.</p>
      </div>
    );
  }

  const lastDay = ai.daily[ai.daily.length - 1];
  const lastDayCallCount = lastDay?.calls ?? 0;
  const lastDaySuccessRate =
    lastDay && lastDay.calls > 0
      ? Math.round((lastDay.success / lastDay.calls) * 1000) / 10
      : null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={item}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Error tracking · performa API · biaya AI (Gemini OCR)
          </p>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div variants={item}>
        <OverviewCards data={overview} />
      </motion.div>

      {/* ── Performance table ── */}
      <motion.div variants={item}>
        <RoutePerformanceTable routes={requests.routes} />
      </motion.div>

      {/* ── Errors + AI cost ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <ErrorFeed errors={overview.recentErrors} />
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Ringkasan Biaya AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Hari ini</p>
                  <p className="text-lg font-bold mt-0.5">
                    {new Intl.NumberFormat("id-ID").format(lastDayCallCount)} call
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lastDaySuccessRate !== null ? `${lastDaySuccessRate}% sukses` : "-"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground">Total · 30 hari</p>
                  <p className="text-lg font-bold mt-0.5">
                    {ai.total.calls.toLocaleString("id-ID")} call
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ai.total.successRate}% sukses
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 border border-border text-center">
                <p className="text-xs text-muted-foreground">Total Biaya · 30 hari</p>
                <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  }).format(ai.total.costUsd)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── AI cost chart ── */}
      <motion.div variants={item}>
        <AiCostChart data={ai} />
      </motion.div>

      {/* ── AI failures ── */}
      <motion.div variants={item}>
        <AiRecentFailures data={ai} />
      </motion.div>
    </motion.div>
  );
}