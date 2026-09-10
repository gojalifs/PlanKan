"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import type { MonitoringOverview } from "@/lib/hooks/use-monitoring-overview";

function statusBadge(status: number) {
  if (status >= 500)
    return <Badge className="bg-rose-100 text-rose-700 border-transparent dark:bg-rose-950 dark:text-rose-300 text-[10px]">{status}</Badge>;
  if (status >= 400)
    return <Badge className="bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950 dark:text-amber-300 text-[10px]">{status}</Badge>;
  return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function ErrorFeed({
  errors,
}: {
  errors: MonitoringOverview["recentErrors"];
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Error Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        {errors.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            Tidak ada error — semua bersih ✓
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {errors.map((e, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-shrink-0 mt-0.5">{statusBadge(e.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium text-foreground truncate">
                      {e.method} /{e.route}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(e.createdAt)} {formatTime(e.createdAt)}
                    </span>
                  </div>
                  {e.error && (
                    <p className="text-xs text-rose-600 mt-0.5 truncate">{e.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}