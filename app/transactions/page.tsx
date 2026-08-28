"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTransactions, Transaction } from "@/lib/hooks/use-transactions";
import { useWallets } from "@/lib/hooks/use-wallets";
import { useCategories } from "@/lib/hooks/use-categories";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionModal } from "@/components/transactions/transaction-modal";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Edit2,
  Trash2,
  Filter,
  RotateCcw,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TransactionsPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();

  // Filters State
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterWalletId, setFilterWalletId] = useState<string>("ALL");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { wallets } = useWallets();
  const { categories } = useCategories();
  const {
    transactions,
    summary,
    isLoading,
    deleteTransaction,
    isDeleting,
  } = useTransactions({
    type: filterType as any,
    walletId: filterWalletId,
    categoryId: filterCategoryId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

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

  const handleEdit = (tx: Transaction) => {
    setTxToEdit(tx);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setTxToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!txToDelete) return;
    await deleteTransaction(txToDelete.id);
    setTxToDelete(null);
  };

  const handleResetFilters = () => {
    setFilterType("ALL");
    setFilterWalletId("ALL");
    setFilterCategoryId("ALL");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catat dan pantau seluruh transaksi pengeluaran, pemasukan, dan transfer.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          Catat Transaksi
        </Button>
      </div>

      {/* Summary Cards for Current Filter */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Total Pemasukan Filter
            </span>
            <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? "..." : formatRupiah(summary.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
              Total Pengeluaran Filter
            </span>
            <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
              {isLoading ? "..." : formatRupiah(summary.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Selisih Bersih (Cash Flow)
            </span>
            <div
              className={`text-xl font-bold tracking-tight mt-1 ${
                summary.netCashflow >= 0
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isLoading ? "..." : formatRupiah(summary.netCashflow)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filter Transaksi
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-primary hover:underline lowercase font-normal"
            >
              <RotateCcw className="h-3 w-3" />
              reset filter
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Type */}
            <div className="space-y-1">
              <Label className="text-xs">Tipe</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe</SelectItem>
                  <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                  <SelectItem value="INCOME">Pemasukan</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Wallet */}
            <div className="space-y-1">
              <Label className="text-xs">Dompet</Label>
              <Select value={filterWalletId} onValueChange={setFilterWalletId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Semua Dompet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Dompet</SelectItem>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-xs">Kategori</Label>
              <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Daftar Transaksi ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <ArrowLeftRight className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Tidak ada transaksi yang cocok</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coba ubah filter atau catat transaksi baru.
              </p>
              <Button onClick={handleOpenAdd} size="sm" className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                Catat Transaksi
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                const isExpense = tx.type === "EXPENSE";
                const isTransfer = tx.type === "TRANSFER";

                return (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 hover:bg-muted/30 px-2 rounded-lg gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isIncome
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                            : isExpense
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                            : "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
                        }`}
                      >
                        {isIncome && <ArrowDownLeft className="h-5 w-5" />}
                        {isExpense && <ArrowUpRight className="h-5 w-5" />}
                        {isTransfer && <ArrowLeftRight className="h-5 w-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {isTransfer
                              ? `Transfer: ${tx.wallet?.name} ➔ ${tx.destinationWallet?.name}`
                              : tx.category?.name || "Tanpa Kategori"}
                          </p>
                          <Badge
                            variant={
                              isIncome ? "income" : isExpense ? "expense" : "transfer"
                            }
                            className="text-[10px]"
                          >
                            {tx.type}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateIndo(tx.date)}
                          </span>
                          <span>•</span>
                          <span>Dompet: {tx.wallet?.name}</span>
                          {tx.note && (
                            <>
                              <span>•</span>
                              <span className="italic text-foreground/80">"{tx.note}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <p
                        className={`text-base font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isExpense
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-sky-600 dark:text-sky-400"
                        }`}
                      >
                        {isIncome ? "+" : isExpense ? "-" : ""}
                        {formatRupiah(tx.amount)}
                      </p>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(tx)}
                          title="Edit Transaksi"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setTxToDelete(tx)}
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        transactionToEdit={txToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!txToDelete}
        onOpenChange={(open) => !open && setTxToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Hapus Transaksi
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus transaksi sebesar{" "}
              <span className="font-semibold text-foreground">
                {txToDelete ? formatRupiah(txToDelete.amount) : ""}
              </span>
              ? Saldo dompet terkait akan disesuaikan kembali secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setTxToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Transaksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
