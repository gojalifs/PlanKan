"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock } from "lucide-react";
import type { MonitoringAi } from "@/lib/hooks/use-monitoring-ai";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiRecentFailures({ data }: { data: MonitoringAi }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-rose-500" />
          Panggilan Gemini Gagal Terbaru
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        {data.recentFailures.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            Tidak ada kegagalan — semua panggilan berhasil ✓
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {data.recentFailures.map((f, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {f.statusCode ? (
                    <Badge className="bg-rose-100 text-rose-700 border-transparent dark:bg-rose-950 dark:text-rose-300 text-[10px]">
                      {f.statusCode}
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-200 text-gray-700 border-transparent dark:bg-gray-800 dark:text-gray-300 text-[10px]">
                      network
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium text-foreground truncate">
                      {f.model}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTime(f.createdAt)}
                    </span>
                  </div>
                  {f.errorMessage && (
                    <p className="text-xs text-rose-600 mt-0.5 truncate">{f.errorMessage}</p>
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