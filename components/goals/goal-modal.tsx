"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/ui/amount-input";
import { formatAmountNumber, parseAmountInput } from "@/lib/format";
import { useGoals, FinancialGoal } from "@/lib/hooks/use-goals";
import { useWallets } from "@/lib/hooks/use-wallets";
import { Loader2, PiggyBank } from "lucide-react";

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalToEdit?: FinancialGoal | null;
}

const COLOR_PRESETS = [
  "#10b981", // emerald
  "#0284c7", // sky/blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#ef4444", // red
];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return iso.slice(0, 10);
}

export function GoalModal({ open, onOpenChange, goalToEdit }: GoalModalProps) {
  // Remount the form whenever the dialog (re)opens so it initializes straight
  // from `goalToEdit`, avoiding an effect that syncs state after the fact.
  const formKey = open ? (goalToEdit?.id ?? "new") : "closed";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <GoalForm
          key={formKey}
          goalToEdit={goalToEdit}
          onSaved={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  goalToEdit,
  onSaved,
  onCancel,
}: {
  goalToEdit?: FinancialGoal | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { createGoal, updateGoal, isCreating, isUpdating } = useGoals();
  const { wallets } = useWallets();

  const [name, setName] = useState(goalToEdit?.name ?? "");
  const [targetAmount, setTargetAmount] = useState<string>(
    goalToEdit ? formatAmountNumber(goalToEdit.targetAmount) : ""
  );
  const [currentAmount, setCurrentAmount] = useState<string>(
    goalToEdit ? formatAmountNumber(goalToEdit.currentAmount) : "0"
  );
  const [targetDate, setTargetDate] = useState<string>(
    toDateInputValue(goalToEdit?.targetDate)
  );
  const [walletId, setWalletId] = useState<string>(goalToEdit?.walletId ?? "none");
  const [color, setColor] = useState<string>(goalToEdit?.color ?? "#10b981");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numTarget = parseAmountInput(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) return;

    const numCurrent = parseAmountInput(currentAmount) || 0;

    try {
      if (goalToEdit) {
        await updateGoal({
          id: goalToEdit.id,
          name: name.trim(),
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate: targetDate || null,
          walletId: walletId === "none" ? null : walletId,
          color,
        });
      } else {
        await createGoal({
          name: name.trim(),
          targetAmount: numTarget,
          currentAmount: numCurrent,
          targetDate: targetDate || null,
          walletId: walletId === "none" ? null : walletId,
          color,
        });
      }
      onSaved();
    } catch (err) {
      console.error(err);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PiggyBank className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {goalToEdit ? "Edit Tujuan Keuangan" : "Tambah Tujuan Keuangan"}
          </DialogTitle>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-xs">
              Nama Tujuan
            </Label>
            <Input
              id="goal-name"
              placeholder="Contoh: Dana Darurat, Liburan Bali, DP Rumah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-target" className="text-xs">
              Target Dana (Rp)
            </Label>
            <AmountInput
              id="goal-target"
              value={targetAmount}
              onValueChange={setTargetAmount}
              required
            />
          </div>

          {/* Current Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-current" className="text-xs">
              {goalToEdit ? "Dana Saat Ini (Rp)" : "Dana Awal (Rp)"}
            </Label>
            <AmountInput
              id="goal-current"
              value={currentAmount}
              onValueChange={setCurrentAmount}
            />
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-date" className="text-xs">
              Target Selesai (opsional)
            </Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={goalToEdit ? undefined : new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* Wallet */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dompet Terkait (opsional)</Label>
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih dompet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa dompet terkait</SelectItem>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color Selection */}
          <div className="space-y-1.5">
            <Label>Warna Tema</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : goalToEdit ? (
                "Simpan Perubahan"
              ) : (
                "Buat Tujuan"
              )}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}