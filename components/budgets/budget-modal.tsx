"use client";

import React, { useEffect, useState } from "react";
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
import { useCategories } from "@/lib/hooks/use-categories";
import { useBudgets, BudgetItem, SubBudgetItem } from "@/lib/hooks/use-budgets";
import { formatRupiah } from "@/lib/utils";
import { Loader2, Target, Tag, CornerDownRight } from "lucide-react";

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetItem?: BudgetItem | SubBudgetItem | null;
  defaultCategoryId?: string;
}

export function BudgetModal({
  open,
  onOpenChange,
  budgetItem,
  defaultCategoryId,
}: BudgetModalProps) {
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { saveBudget, isSaving } = useBudgets();

  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (budgetItem) {
      setCategoryId(budgetItem.categoryId);
      setAmount(budgetItem.budgetAmount > 0 ? String(budgetItem.budgetAmount) : "");
    } else if (defaultCategoryId) {
      setCategoryId(defaultCategoryId);
      setAmount("");
    } else if (expenseCategories.length > 0 && !categoryId) {
      setCategoryId(expenseCategories[0].id);
      setAmount("");
    }
  }, [budgetItem, defaultCategoryId, open, expenseCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) return;

    try {
      await saveBudget({
        categoryId,
        amount: numAmount,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const quickAmounts = [250000, 500000, 1000000, 2000000, 5000000];

  // Organize categories into parents and children for selector
  const parentCats = expenseCategories.filter((c) => !c.parentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {budgetItem && budgetItem.hasBudget
                ? "Edit Anggaran Budget"
                : "Atur Anggaran Kategori"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category Select */}
          <div className="space-y-1.5">
            <Label className="text-xs">Pilih Kategori / Sub-Kategori</Label>
            {budgetItem ? (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/80 bg-muted/30">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs shadow-2xs shrink-0"
                  style={{ backgroundColor: budgetItem.categoryColor }}
                >
                  <Tag className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {budgetItem.categoryName}
                    </p>
                    {"parentName" in budgetItem && budgetItem.parentName && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        Sub dari {budgetItem.parentName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Terpakai bulan ini: {formatRupiah(budgetItem.spentAmount)}
                  </p>
                </div>
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Pilih Kategori atau Sub-Kategori" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {parentCats.map((parent) => {
                    const children = expenseCategories.filter((c) => c.parentId === parent.id);
                    return (
                      <React.Fragment key={parent.id}>
                        {/* Parent Category Option */}
                        <SelectItem value={parent.id} className="font-semibold text-xs py-2">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: parent.color }}
                            />
                            [Induk] {parent.name}
                          </span>
                        </SelectItem>

                        {/* Sub-Category Options */}
                        {children.map((sub) => (
                          <SelectItem
                            key={sub.id}
                            value={sub.id}
                            className="text-xs pl-7 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: sub.color || parent.color }}
                              />
                              {sub.name}
                            </span>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount" className="text-xs">
              Batas Anggaran Bulanan (Rp)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">
                Rp
              </span>
              <Input
                id="budget-amount"
                type="number"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg font-bold h-11"
                required
                autoFocus
              />
            </div>
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-xs text-primary font-medium mt-1">
                {formatRupiah(Number(amount))} per bulan
              </p>
            )}
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Nominal Cepat:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 text-xs rounded-md border border-border/80 bg-muted/30 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all"
                >
                  {formatRupiah(q)}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Anggaran"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
