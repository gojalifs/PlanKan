"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoals, FinancialGoal } from "@/lib/hooks/use-goals";
import { useMeUsage } from "@/lib/hooks/use-me-usage";
import { formatRupiah } from "@/lib/utils";
import { parseAmountInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { GoalModal } from "@/components/goals/goal-modal";
import {
  PiggyBank,
  Plus,
  Edit2,
  Trash2,
  CalendarDays,
  Wallet as WalletIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function formatGoalDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export default function GoalsPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();
  const { goals, summary, isLoading, isDeleting, deleteGoal, updateGoal, isUpdating } = useGoals();
  const { data: usage } = useMeUsage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<FinancialGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<FinancialGoal | null>(null);
  const [goalToContribute, setGoalToContribute] = useState<FinancialGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState<string>("");

  const canUseGoals = usage?.entitlements?.["ai.financial_goals"] === true;

  if (isAuthPending) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  const handleOpenAdd = () => {
    setGoalToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (goal: FinancialGoal) => {
    setGoalToEdit(goal);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!goalToDelete) return;
    await deleteGoal(goalToDelete.id);
    setGoalToDelete(null);
  };

  const openContribute = (goal: FinancialGoal) => {
    setGoalToContribute(goal);
    setContributeAmount("");
  };

  const handleContribute = async () => {
    if (!goalToContribute) return;
    const delta = parseAmountInput(contributeAmount);
    if (isNaN(delta) || delta <= 0) return;
    await updateGoal({
      id: goalToContribute.id,
      currentAmount: goalToContribute.currentAmount + delta,
    });
    setGoalToContribute(null);
  };

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const completedGoals = goals.filter((g) => g.status === "COMPLETED");

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tujuan Keuangan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tetapkan target tabungan dan pantau progresnya.
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleOpenAdd}
            disabled={!canUseGoals}
            title={canUseGoals ? undefined : "Tersedia di paket Plus ke atas"}
            className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Tujuan Baru
          </Button>
        </motion.div>
      </motion.div>

      {/* Upgrade upsell for non-entitled plans */}
      {!isLoading && !canUseGoals && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-background shadow-xs">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Tujuan keuangan adalah fitur paket Plus</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Naikkan paket untuk menetapkan target tabungan, deadline, dan memantau progres
                  agar kebiasaan menabungmu lebih terarah.
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link href="/pricing">Lihat Paket</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Banner */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-xs">
            <CardContent className="p-6">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Total Terkumpul
              </span>
              <div className="text-2xl font-extrabold tracking-tight mt-2">
                {isLoading ? "..." : formatRupiah(summary.totalSaved)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                dari target {formatRupiah(summary.totalTarget)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-xs">
            <CardContent className="p-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tujuan Aktif
              </span>
              <div className="text-2xl font-extrabold tracking-tight mt-2">
                {isLoading ? "..." : `${activeGoals.length} Tujuan`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">masih berjalan</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-background shadow-xs">
            <CardContent className="p-6">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Selesai
              </span>
              <div className="text-2xl font-extrabold tracking-tight mt-2">
                {isLoading ? "..." : `${completedGoals.length} Tujuan`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">tercapai, selamat!</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Goals Grid */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
              <PiggyBank className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Belum Ada Tujuan</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Mulai dengan target kecil seperti dana darurat atau liburan, lalu pantau progresnya
              sampai tercapai.
            </p>
            <Button onClick={handleOpenAdd} className="mt-4" size="sm" disabled={!canUseGoals}>
              <Plus className="mr-1.5 h-4 w-4" />
              Buat Tujuan Pertama
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const isCompleted = goal.status === "COMPLETED";
              return (
                <Card
                  key={goal.id}
                  className="relative overflow-hidden border-border/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: goal.color }} />
                  <CardContent className="p-6 flex-1 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                          style={{ backgroundColor: goal.color }}
                        >
                          <PiggyBank className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold leading-tight truncate">{goal.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {goal.percent}% terkumpul
                          </p>
                        </div>
                      </div>
                      {isCompleted && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">{formatRupiah(goal.currentAmount)}</span>
                        <span className="text-muted-foreground text-xs">
                          dari {formatRupiah(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${goal.percent}%`,
                            backgroundColor: isCompleted ? "#10b981" : goal.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {!isCompleted && goal.remaining > 0 && (
                        <span>Kurang {formatRupiah(goal.remaining)}</span>
                      )}
                      {goal.targetDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatGoalDate(goal.targetDate)}
                        </span>
                      )}
                      {goal.wallet && (
                        <span className="flex items-center gap-1">
                          <WalletIcon className="h-3.5 w-3.5" />
                          {goal.wallet.name}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-auto">
                      <Button
                        size="sm"
                        disabled={!canUseGoals || isUpdating}
                        onClick={() => openContribute(goal)}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah Dana
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => handleEdit(goal)}
                          title="Edit Tujuan"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => setGoalToDelete(goal)}
                          title="Hapus Tujuan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Add / Edit Modal */}
      <GoalModal open={isModalOpen} onOpenChange={setIsModalOpen} goalToEdit={goalToEdit} />

      {/* Contribute Dialog */}
      <Dialog
        open={!!goalToContribute}
        onOpenChange={(open) => !open && setGoalToContribute(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tambah Dana</DialogTitle>
            <DialogDescription className="pt-1">
              Tambahkan dana ke tujuan{" "}
              <span className="font-semibold text-foreground">{goalToContribute?.name}</span>.
              Saat ini terkumpul{" "}
              <span className="font-semibold text-foreground">
                {goalToContribute ? formatRupiah(goalToContribute.currentAmount) : ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 pt-2">
            <Label htmlFor="contribute-amount" className="text-xs">
              Nominal Tambahan (Rp)
            </Label>
            <AmountInput
              id="contribute-amount"
              value={contributeAmount}
              onValueChange={setContributeAmount}
              className="text-lg font-bold h-11"
              required
              autoFocus
            />
          </div>
          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              onClick={() => setGoalToContribute(null)}
              disabled={isUpdating}
            >
              Batal
            </Button>
            <Button onClick={handleContribute} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Dana"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!goalToDelete}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Hapus Tujuan
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus tujuan{" "}
              <span className="font-semibold text-foreground">&quot;{goalToDelete?.name}&quot;</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setGoalToDelete(null)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}