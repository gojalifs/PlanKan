"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { formatUsd } from "@/lib/hooks/use-monitoring-ai";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonitoringAi } from "@/lib/hooks/use-monitoring-ai";

export function AiCostChart({ data }: { data: MonitoringAi }) {
  const chartData = data.daily.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    cost: Math.round(Number(d.costUsd) * 10000) / 10000,
    calls: d.calls,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Biaya AI per Hari ({data.days} hari terakhir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="aiCostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                width={56}
              />
              <Tooltip
                formatter={(value) => [formatUsd(Number(value)), "Biaya"]}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#aiCostGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {data.daily.length === 0 && (
          <p className="text-center text-xs text-muted-foreground -mt-2">
            Belum ada panggilan Gemini tercatat
          </p>
        )}
      </CardContent>
    </Card>
  );
}