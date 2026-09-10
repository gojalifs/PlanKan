"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, XCircle } from "lucide-react";
import type { MonitoringRouteStats } from "@/lib/hooks/use-monitoring-requests";

function methodBadge(method: string) {
  switch (method) {
    case "GET":
      return <Badge className="bg-blue-100 text-blue-700 border-transparent dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5">{method}</Badge>;
    case "POST":
      return <Badge className="bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5">{method}</Badge>;
    case "PUT":
      return <Badge className="bg-violet-100 text-violet-700 border-transparent dark:bg-violet-950 dark:text-violet-300 text-[10px] px-1.5">{method}</Badge>;
    case "DELETE":
      return <Badge className="bg-rose-100 text-rose-700 border-transparent dark:bg-rose-950 dark:text-rose-300 text-[10px] px-1.5">{method}</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] px-1.5">{method}</Badge>;
  }
}

function latencyBar(p99: number) {
  const max = 5000;
  const pct = Math.min((p99 / max) * 100, 100);
  const color =
    p99 < 200
      ? "bg-emerald-500"
      : p99 < 1000
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RoutePerformanceTable({
  routes,
}: {
  routes: MonitoringRouteStats[];
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Performa per Rute API
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 overflow-x-auto">
        {routes.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            Belum ada data request
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 pl-2">Rute</th>
                <th className="pb-2 text-center">Count</th>
                <th className="pb-2 text-center">Error</th>
                <th className="pb-2 text-right">Avg</th>
                <th className="pb-2 text-right">P95</th>
                <th className="pb-2 text-right">P99</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {routes.map((r, idx) => (
                <tr
                  key={`${r.method}-${r.route}-${idx}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 pl-2">
                    <div className="flex items-center gap-2">
                      {methodBadge(r.method)}
                      <span className="font-mono text-xs">{r.route}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center">{r.count}</td>
                  <td className="py-2 text-center">
                    {r.errorCount > 0 ? (
                      <span className="text-rose-600 font-medium flex items-center justify-center gap-1">
                        <XCircle className="h-3 w-3" /> {r.errorCount}
                      </span>
                    ) : (
                      <span className="text-emerald-600 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 0
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono text-xs">{r.avgMs} ms</td>
                  <td className="py-2 text-right font-mono text-xs">{r.p95} ms</td>
                  <td className="py-2 text-right font-mono text-xs font-semibold">{r.p99} ms</td>
                  <td className="py-2 pr-2">{latencyBar(r.p99)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}