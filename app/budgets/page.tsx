"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useBudgets, BudgetItem, SubBudgetItem } from "@/lib/hooks/use-budgets";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BudgetModal } from "@/components/budgets/budget-modal";
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Tag,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function BudgetsPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [filterTab, setFilterTab] = useState<"ALL" | "BUDGETED" | "OVERBUDGET" | "UNBUDGETED">("ALL");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const {
    items,
    summary,
    isLoading,
    deleteBudget,
    isDeleting,
  } = useBudgets(selectedMonth, selectedYear);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudgetItem, setSelectedBudgetItem] = useState<BudgetItem | SubBudgetItem | null>(null);
  const [defaultCatId, setDefaultCatId] = useState<string | undefined>(undefined);
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null);

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

  const toggleExpand = (catId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleOpenAdd = (categoryId?: string) => {
    setSelectedBudgetItem(null);
    setDefaultCatId(categoryId);
    setIsModalOpen(true);
  };

  const handleEditBudget = (item: BudgetItem | SubBudgetItem) => {
    setSelectedBudgetItem(item);
    setDefaultCatId(item.categoryId);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete || !budgetToDelete.id) return;
    await deleteBudget(budgetToDelete.id);
    setBudgetToDelete(null);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const hasAnyOverbudget =
      (item.hasBudget && item.spentAmount > item.budgetAmount) ||
      (item.subCategories || []).some((s) => s.hasBudget && s.spentAmount > s.budgetAmount);

    if (filterTab === "BUDGETED") return item.hasBudget;
    if (filterTab === "OVERBUDGET") return hasAnyOverbudget;
    if (filterTab === "UNBUDGETED") return !item.hasBudget;
    return true;
  });

  const budgetedItems = items.filter((i) => i.hasBudget);
  const unbudgetedItems = items.filter((i) => !i.hasBudget);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      {/* Header & Month Selector */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Anggaran Bulanan (Budget)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tetapkan batas anggaran pada kategori utama maupun per sub-kategori untuk kontrol keuangan optimal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Switcher */}
          <div className="flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[130px] text-center text-xs sm:text-sm font-semibold">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => handleOpenAdd()}
              className="flex items-center gap-1.5 shadow-sm shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Atur Anggaran</span>
              <span className="sm:hidden">Budget</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Summary Stat Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Budget */}
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Anggaran
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight">
                  {isLoading ? "..." : formatRupiah(summary.totalBudgeted)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dari {summary.budgetCount} pos anggaran aktif
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Spent in Budget */}
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pengeluaran Terhitung
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {isLoading ? "..." : formatRupiah(summary.totalSpentInBudgetedCategories)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total pengeluaran bulan ini: {formatRupiah(summary.totalOverallExpense)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Remaining Budget */}
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sisa Anggaran
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    summary.remainingBudget >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isLoading ? "..." : formatRupiah(summary.remainingBudget)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.remainingBudget >= 0 ? "Kondisi aman terkendali" : "Melebihi total batas anggaran"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Overall Status */}
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status Pemakaian
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold tracking-tight">
                    {isLoading ? "..." : `${summary.overallPercentage.toFixed(0)}%`}
                  </span>
                  <Badge
                    variant={
                      summary.overbudgetCount > 0
                        ? "destructive"
                        : summary.overallPercentage > 85
                        ? "warning"
                        : "income"
                    }
                    className="text-[10px]"
                  >
                    {summary.overbudgetCount > 0
                      ? `${summary.overbudgetCount} Overbudget`
                      : summary.overallPercentage > 85
                      ? "Mendekati Limit"
                      : "Terkendali"}
                  </Badge>
                </div>
                <div className="h-2 w-full rounded-full bg-muted mt-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(summary.overallPercentage, 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      summary.overallPercentage > 100
                        ? "bg-rose-500"
                        : summary.overallPercentage > 75
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        <Button
          variant={filterTab === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("ALL")}
          className="text-xs"
        >
          Semua Kategori ({items.length})
        </Button>
        <Button
          variant={filterTab === "BUDGETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("BUDGETED")}
          className="text-xs"
        >
          Dianggarkan ({budgetedItems.length})
        </Button>
        <Button
          variant={filterTab === "OVERBUDGET" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("OVERBUDGET")}
          className="text-xs"
        >
          Overbudget ({summary.overbudgetCount})
        </Button>
        <Button
          variant={filterTab === "UNBUDGETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterTab("UNBUDGETED")}
          className="text-xs"
        >
          Belum Dianggarkan ({unbudgetedItems.length})
        </Button>
      </motion.div>

      {/* Budgets Grid */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-56 animate-pulse bg-muted/50 rounded-2xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed p-12 text-center rounded-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Tidak Ada Kategori pada Filter Ini</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Atur anggaran untuk pos pengeluaran utama atau rincian sub-kategori.
            </p>
            <Button onClick={() => handleOpenAdd()} className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Atur Anggaran Sekarang
            </Button>
          </Card>
        ) : (
          <motion.div
            layout
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const isOver = item.hasBudget && item.spentAmount > item.budgetAmount;
                const isWarning =
                  item.hasBudget &&
                  !isOver &&
                  item.percentage >= 75;

                const subCats = item.subCategories || [];
                const isExpanded = Boolean(expandedParents[item.categoryId]);

                return (
                  <motion.div
                    layout
                    key={item.categoryId}
                    variants={itemVariants}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    className="h-full"
                  >
                    <Card
                      className={`relative overflow-hidden border-border/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full rounded-2xl ${
                        isOver
                          ? "ring-1 ring-rose-500/30 bg-rose-500/[0.02]"
                          : isWarning
                          ? "ring-1 ring-amber-500/30 bg-amber-500/[0.02]"
                          : ""
                      }`}
                    >
                      <div>
                        {/* Top Accent Strip */}
                        <div
                          className="h-2 w-full"
                          style={{ backgroundColor: item.categoryColor }}
                        />

                        <CardHeader className="pb-3 pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
                                style={{ backgroundColor: item.categoryColor }}
                              >
                                <Tag className="h-5 w-5" />
                              </div>
                              <div className="truncate">
                                <CardTitle className="text-base font-bold truncate">
                                  {item.categoryName}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {subCats.length > 0 ? `${subCats.length} sub-kategori` : "Kategori Utama"}
                                  {item.hasDirectBudget && " • Budget Induk"}
                                  {!item.hasDirectBudget && item.subBudgetsTotal > 0 && " • Budget Sub"}
                                </p>
                              </div>
                            </div>

                            {item.hasBudget ? (
                              <Badge
                                variant={
                                  isOver
                                    ? "destructive"
                                    : isWarning
                                    ? "warning"
                                    : "income"
                                }
                                className="text-[10px] shrink-0"
                              >
                                {isOver
                                  ? "Melebihi Limit"
                                  : isWarning
                                  ? "Waspada"
                                  : "Aman"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                                Belum Diatur
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-1">
                          {item.hasBudget ? (
                            <>
                              {/* Numbers */}
                              <div>
                                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                                  <span>Total Terpakai (Gabungan):</span>
                                  <span className="font-semibold text-foreground">
                                    {item.percentage.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline mt-1">
                                  <span className="text-lg font-bold tracking-tight text-foreground">
                                    {formatRupiah(item.spentAmount)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    dari {formatRupiah(item.budgetAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Main Progress Bar */}
                              <div className="space-y-1.5">
                                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${Math.min(item.percentage, 100)}%`,
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full rounded-full ${
                                      isOver
                                        ? "bg-rose-500"
                                        : isWarning
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                  />
                                </div>

                                <div className="flex justify-between text-xs pt-0.5">
                                  <span className="text-muted-foreground">
                                    {isOver ? "Kelebihan:" : "Sisa Anggaran:"}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      isOver
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                    }`}
                                  >
                                    {isOver
                                      ? `+${formatRupiah(Math.abs(item.remainingAmount))}`
                                      : formatRupiah(item.remainingAmount)}
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Pengeluaran bulan ini:{" "}
                                <span className="font-semibold text-foreground">
                                  {formatRupiah(item.spentAmount)}
                                </span>
                              </p>
                              <Button
                                onClick={() => handleEditBudget(item)}
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-8 gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Atur Budget Induk
                              </Button>
                            </div>
                          )}

                          {/* Sub Categories Accordion */}
                          {subCats.length > 0 && (
                            <div className="pt-2 border-t border-border/60">
                              <button
                                onClick={() => toggleExpand(item.categoryId)}
                                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <CornerDownRight className="h-3.5 w-3.5 text-primary" />
                                  Rincian Sub-Kategori ({subCats.length})
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>

                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="overflow-hidden space-y-2 pt-2"
                                  >
                                    {subCats.map((sub) => {
                                      const isSubOver =
                                        sub.hasBudget && sub.spentAmount > sub.budgetAmount;

                                      return (
                                        <div
                                          key={sub.categoryId}
                                          className="p-2.5 rounded-xl bg-muted/35 border border-border/50 space-y-1.5 text-xs"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-foreground truncate">
                                              {sub.categoryName}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              {sub.hasBudget ? (
                                                <Badge
                                                  variant={isSubOver ? "destructive" : "outline"}
                                                  className="text-[9px] px-1.5 py-0"
                                                >
                                                  {isSubOver
                                                    ? "Over"
                                                    : `${sub.percentage.toFixed(0)}%`}
                                                </Badge>
                                              ) : (
                                                <button
                                                  onClick={() => handleEditBudget(sub)}
                                                  className="text-[10px] text-primary hover:underline"
                                                >
                                                  + Atur Budget
                                                </button>
                                              )}

                                              {sub.hasBudget && (
                                                <>
                                                  <button
                                                    onClick={() => handleEditBudget(sub)}
                                                    className="p-1 hover:text-primary transition-colors"
                                                    title="Edit Budget Sub"
                                                  >
                                                    <Edit2 className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setBudgetToDelete({
                                                        id: sub.id!,
                                                        name: sub.categoryName,
                                                      })
                                                    }
                                                    className="p-1 hover:text-destructive transition-colors"
                                                    title="Hapus Budget Sub"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                                            <span>
                                              Terpakai: {formatRupiah(sub.spentAmount)}
                                            </span>
                                            {sub.hasBudget && (
                                              <span>Target: {formatRupiah(sub.budgetAmount)}</span>
                                            )}
                                          </div>

                                          {sub.hasBudget && (
                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${
                                                  isSubOver ? "bg-rose-500" : "bg-primary"
                                                }`}
                                                style={{
                                                  width: `${Math.min(sub.percentage, 100)}%`,
                                                }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </CardContent>
                      </div>

                      {/* Parent Actions */}
                      <div className="p-4 pt-0">
                        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                          <span>
                            {item.hasDirectBudget
                              ? "Budget Induk Aktif"
                              : item.subBudgetsTotal > 0
                              ? "Total dari Sub-Kategori"
                              : "Belum Ada Budget"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => handleEditBudget(item)}
                              title="Edit Budget Induk"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {item.hasDirectBudget && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                onClick={() =>
                                  setBudgetToDelete({
                                    id: item.id!,
                                    name: item.categoryName,
                                  })
                                }
                                title="Hapus Budget Induk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Add / Edit Budget Modal */}
      <BudgetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        budgetItem={selectedBudgetItem}
        defaultCategoryId={defaultCatId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!budgetToDelete}
        onOpenChange={(open) => !open && setBudgetToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Hapus Anggaran
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus batas anggaran untuk kategori{" "}
              <span className="font-semibold text-foreground">
                "{budgetToDelete?.name}"
              </span>
              ? Riwayat transaksi pengeluaran kategori ini akan tetap aman tersimpan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setBudgetToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Anggaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
