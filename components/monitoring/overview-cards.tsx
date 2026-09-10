"use client";

import { motion } from "framer-motion";
import { Activity, AlertTriangle, Gauge, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatUsd } from "@/lib/hooks/use-monitoring-ai";
import type { MonitoringOverview } from "@/lib/hooks/use-monitoring-overview";

function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewCards({ data }: { data: MonitoringOverview }) {
  const { api, gemini } = data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div variants={{ hidden: {}, visible: {} }}>
        <StatCard
          label="Request (7 hari)"
          value={api.requests7d.toLocaleString("id-ID")}
          sub={`${api.errorCount} error · ${api.errorRate}%`}
          icon={<Activity className="h-5 w-5" />}
          iconBg={api.errorRate > 10 ? "bg-amber-500/10" : "bg-blue-500/10"}
          iconColor={api.errorRate > 10 ? "text-amber-500" : "text-blue-500"}
        />
      </motion.div>

      <StatCard
        label="Latensi Avg / P95 / P99"
        value={`${api.avgMs} ms`}
        sub={`p95 ${api.p95Ms} · p99 ${api.p99Ms}`}
        icon={<Gauge className="h-5 w-5" />}
        iconBg="bg-violet-500/10"
        iconColor="text-violet-500"
      />

      <StatCard
        label="Biaya AI Hari Ini"
        value={formatUsd(gemini.today.costUsd)}
        sub={`${gemini.today.calls} call · ${gemini.today.successRate}% sukses`}
        icon={<DollarSign className="h-5 w-5" />}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
      />

      <StatCard
        label="Biaya AI Bulan Ini"
        value={formatUsd(gemini.month.costUsd)}
        sub={`${gemini.month.calls} call · ${gemini.month.successRate}% sukses`}
        icon={
          gemini.month.successRate < 90 ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <DollarSign className="h-5 w-5" />
          )
        }
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
      />
    </div>
  );
}