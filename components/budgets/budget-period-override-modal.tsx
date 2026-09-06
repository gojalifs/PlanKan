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
import {
  useBudgetPeriodOverrides,
  useBudgetPeriodSetting,
} from "@/lib/hooks/use-budget-period";
import { lastWorkingDayOf } from "@/lib/budget-period";
import { CalendarCog, Loader2, Trash2, AlertCircle, Minus, Plus } from "lucide-react";

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The budget month this override is for (1-12) */
  budgetMonth: number;
  budgetYear: number;
}

/**
 * Task 2 – Per-month override for the budget period start day.
 * Shows the effective default (from global setting), and lets the user
 * pick a specific day for this month only.
 */
export function BudgetPeriodOverrideModal({ open, onOpenChange, budgetMonth, budgetYear }: Props) {
  const { setting } = useBudgetPeriodSetting();
  const { currentOverride, saveOverride, isSaving, deleteOverride, isDeleting } =
    useBudgetPeriodOverrides(budgetMonth, budgetYear);

  // The prev calendar month (where the start day lives)
  const prevMonth = budgetMonth === 1 ? 12 : budgetMonth - 1;
  const prevYear = budgetMonth === 1 ? budgetYear - 1 : budgetYear;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();

  // Compute default start day
  const defaultStartDay =
    setting.method === "FIXED_DAY" && setting.fixedDay
      ? setting.fixedDay
      : lastWorkingDayOf(prevYear, prevMonth);

  const [startDay, setStartDay] = useState<number>(defaultStartDay);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (currentOverride) {
      setStartDay(currentOverride.startDay);
    } else {
      setStartDay(defaultStartDay);
    }
    setConfirmDelete(false);
  }, [currentOverride, defaultStartDay, open]);

  const selectedDate = new Date(prevYear, prevMonth - 1, startDay);
  const previewLabel = selectedDate.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleSave = async () => {
    await saveOverride({ month: budgetMonth, year: budgetYear, startDay });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteOverride({ month: budgetMonth, year: budgetYear });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCog className="h-5 w-5 text-primary" />
            Override Awal Bulan Budget
          </DialogTitle>
          <DialogDescription>
            Atur tanggal awal periode budget{" "}
            <strong>
              {MONTH_NAMES[budgetMonth - 1]} {budgetYear}
            </strong>{" "}
            secara manual. Ini hanya berlaku untuk bulan ini saja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Current override indicator */}
          {currentOverride ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs font-medium">
                Override aktif: mulai tanggal <strong>{currentOverride.startDay}</strong>{" "}
                {MONTH_NAMES[prevMonth - 1]} {prevYear}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/60 border border-border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">
                Default aktif: tanggal <strong>{defaultStartDay}</strong>{" "}
                {MONTH_NAMES[prevMonth - 1]} {prevYear}
                {setting.method === "LAST_WORKING_DAY" ? " (hari kerja terakhir)" : " (tanggal tetap)"}
              </p>
            </div>
          )}

          {/* Day picker */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Pilih hari mulai (dari bulan{" "}
              {MONTH_NAMES[prevMonth - 1]} {prevYear})
            </p>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={daysInPrevMonth}
              value={startDay}
              onChange={(e) => setStartDay(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span className="font-bold text-primary text-sm">{startDay}</span>
              <span>{daysInPrevMonth}</span>
            </div>

            {/* Stepper + number input */}
            <div className="flex items-center gap-2 justify-center mt-1">
              <span className="text-sm text-muted-foreground">Tanggal:</span>
              <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStartDay((d) => Math.max(1, d - 1))}
                  disabled={startDay <= 1}
                  className="px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Kurangi tanggal"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={daysInPrevMonth}
                  value={startDay}
                  onChange={(e) =>
                    setStartDay(Math.min(daysInPrevMonth, Math.max(1, Number(e.target.value))))
                  }
                  className="w-14 border-x border-border bg-background px-1 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setStartDay((d) => Math.min(daysInPrevMonth, d + 1))}
                  disabled={startDay >= daysInPrevMonth}
                  className="px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Tambah tanggal"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Budget {MONTH_NAMES[budgetMonth - 1]} {budgetYear} akan dimulai:
            </p>
            <p className="text-sm font-bold text-primary mt-0.5">{previewLabel}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          {currentOverride && (
            <Button
              variant="outline"
              className={confirmDelete ? "border-rose-500 text-rose-600" : ""}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {confirmDelete ? "Yakin hapus override?" : "Hapus Override"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan Override
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
