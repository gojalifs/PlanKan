"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBudgetPeriodSetting, BudgetPeriodMethod } from "@/lib/hooks/use-budget-period";
import { lastWorkingDayOf } from "@/lib/budget-period";
import { Settings2, CalendarDays, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Task 1 – Global budget period start setting.
 * Lets the user choose between:
 *   - Last working day of the previous month (default)
 *   - A fixed day-of-month (1–28)
 */
export function BudgetPeriodSettingModal({ open, onOpenChange }: Props) {
  const { setting, isLoading, updateSetting, isUpdating } = useBudgetPeriodSetting();

  const [method, setMethod] = useState<BudgetPeriodMethod>("LAST_WORKING_DAY");
  const [fixedDay, setFixedDay] = useState<number>(1);

  // Sync form state when setting loads
  useEffect(() => {
    if (setting) {
      setMethod(setting.method);
      setFixedDay(setting.fixedDay ?? 1);
    }
  }, [setting]);

  const handleSave = async () => {
    await updateSetting({ method, fixedDay: method === "FIXED_DAY" ? fixedDay : null });
    onOpenChange(false);
  };

  // Preview: what day would August 2026 start on?
  const previewMonth = new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2;
  const previewYear =
    previewMonth === 1 ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const prevCalM = previewMonth === 1 ? 12 : previewMonth - 1;
  const prevCalY = previewMonth === 1 ? previewYear - 1 : previewYear;
  const lwd = lastWorkingDayOf(prevCalY, prevCalM);
  const previewDate =
    method === "LAST_WORKING_DAY"
      ? new Date(prevCalY, prevCalM - 1, lwd)
      : new Date(prevCalY, prevCalM - 1, Math.min(fixedDay, lwd));

  const previewLabel = previewDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const budgetMonthLabel = new Date(previewYear, previewMonth - 1, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Pengaturan Awal Bulan Budget
          </DialogTitle>
          <DialogDescription>
            Tentukan hari pertama periode budget secara global. Bisa di-override per bulan di
            halaman ini.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Method selector */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Metode Awal Bulan</p>

              {/* Option 1: Last working day */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border p-3.5 hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="method"
                  value="LAST_WORKING_DAY"
                  checked={method === "LAST_WORKING_DAY"}
                  onChange={() => setMethod("LAST_WORKING_DAY")}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold">Hari Kerja Terakhir Bulan Sebelumnya</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Default. Periode budget dimulai pada Senin–Jumat terakhir di bulan
                    sebelumnya.
                  </p>
                </div>
              </label>

              {/* Option 2: Fixed day */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border p-3.5 hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="method"
                  value="FIXED_DAY"
                  checked={method === "FIXED_DAY"}
                  onChange={() => setMethod("FIXED_DAY")}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Tanggal Tetap Setiap Bulan</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Periode budget selalu dimulai pada tanggal yang sama di bulan sebelumnya.
                  </p>
                  {method === "FIXED_DAY" && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Tanggal:</span>
                      <input
                        type="number"
                        min={1}
                        max={28}
                        value={fixedDay}
                        onChange={(e) =>
                          setFixedDay(Math.min(28, Math.max(1, Number(e.target.value))))
                        }
                        className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">(1–28)</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-muted/60 border border-border px-4 py-3 flex items-start gap-3">
              <CalendarDays className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Preview</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Budget {budgetMonthLabel} akan mulai pada:
                </p>
                <p className="text-sm font-bold text-primary mt-0.5">{previewLabel}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || isLoading}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simpan Pengaturan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
