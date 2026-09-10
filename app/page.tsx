"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useSummary } from "@/lib/hooks/use-summary";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { TransactionModal } from "@/components/transactions/transaction-modal";
import { TransactionDetailDialog } from "@/components/transactions/transaction-detail";
import { TransactionQuickFlows } from "@/components/transactions/receipt-flow";
import type { Transaction } from "@/lib/hooks/use-transactions";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function HomePage() {
  const { data: session, isPending } = useSession();
  const { data: summary, isLoading: isSummaryLoading } = useSummary();
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToView, setTxToView] = useState<Transaction | null>(null);

  // If loading session state
  if (isPending) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat data PlanKan...</p>
        </motion.div>
      </div>
    );
  }

  // If not logged in, show Hero / Landing Page
  if (!session?.user) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="flex min-h-[calc(100vh-4rem)] flex-col"
      >
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-6 shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Solusi Budgeting Harian Modern & Simpel
            </motion.div>
            <motion.h1
              variants={itemVariants}
              className="text-4xl font-extrabold tracking-tight sm:text-6xl mb-6"
            >
              Kendalikan Keuangan Anda dengan{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PlanKan
              </span>
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Aplikasi pencatatan pengeluaran & pemasukan multi-dompet yang cepat, intuitif, dan bebas ribet. Catat arus kas harian Anda dalam hitungan detik.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button asChild size="lg" className="w-full sm:w-auto text-base gap-2 shadow-lg shadow-primary/25">
                  <Link href="/register">
                    Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base">
                  <Link href="/login">Masuk ke Akun</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <motion.div variants={containerVariants} className="grid gap-8 md:grid-cols-3">
            <motion.div variants={itemVariants} whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
              <Card className="border-border/60 shadow-sm hover:shadow-md transition-all h-full">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Multi-Dompet Terintegrasi</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Kelola berbagai jenis dompet mulai dari Rekening Bank (BCA, Mandiri, dll), E-Wallet (GoPay, OVO, Dana), hingga Kas Tunai di satu tempat.
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
              <Card className="border-border/60 shadow-sm hover:shadow-md transition-all h-full">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Pencatatan Cepat & Akurat</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Catat Pengeluaran, Pemasukan, dan Transfer Antar-Dompet secara instan dengan update saldo otomatis dan konsisten.
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
              <Card className="border-border/60 shadow-sm hover:shadow-md transition-all h-full">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Aman & Terstruktur</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Dilengkapi enkripsi autentikasi Better Auth dan database PostgreSQL tangguh untuk menjamin privasi finansial Anda.
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </section>
      </motion.div>
    );
  }

  // Logged-in Dashboard
  const {
    totalNetWorth = 0,
    monthlyIncome = 0,
    monthlyExpense = 0,
    netCashflow = 0,
    wallets = [],
    recentTransactions = [],
    categoryExpenses = [],
  } = summary || {};

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Halo, {session.user.name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Berikut ringkasan kondisi keuangan & arus kas harian Anda bulan ini.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <PlusCircle className="h-4 w-4" />
              Catat Transaksi
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Overview Stat Cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Net Worth */}
        <motion.div variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Kekayaan
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight">
                  {isSummaryLoading ? "..." : formatRupiah(totalNetWorth)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dari {wallets.filter((w) => !w.isExcludedFromTotal).length} dompet aktif
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pemasukan Bulan Ini */}
        <motion.div variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pemasukan Bulan Ini
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {isSummaryLoading ? "..." : formatRupiah(monthlyIncome)}
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Pemasukan tercatat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pengeluaran Bulan Ini */}
        <motion.div variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pengeluaran Bulan Ini
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {isSummaryLoading ? "..." : formatRupiah(monthlyExpense)}
                </div>
                <div className="flex items-center gap-1 text-xs text-rose-600 mt-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Pengeluaran tercatat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Arus Kas Bersih */}
        <motion.div variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Arus Kas Bersih
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    netCashflow >= 0
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isSummaryLoading ? "..." : formatRupiah(netCashflow)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netCashflow >= 0 ? "Surplus Keuangan" : "Defisit Keuangan"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Grid: Wallets & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Wallets & Category Breakdown (1 col) */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Wallets Preview */}
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Daftar Dompet</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-primary">
                <Link href="/wallets">Kelola Dompet</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {wallets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada dompet dibuat.
                </p>
              ) : (
                wallets.map((wallet) => (
                  <motion.div
                    key={wallet.id}
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: wallet.color }}
                      />
                      <div>
                        <p className="text-sm font-medium leading-none">{wallet.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {wallet.type} {wallet.isExcludedFromTotal && "• Sembunyi"}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-bold">
                      {formatRupiah(wallet.balance)}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Category Expenses Breakdown */}
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Pengeluaran per Kategori</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild className="text-xs text-primary h-7 px-2">
                  <Link href="/budgets">Budget</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                  <Link href="/categories">Kategori</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada pengeluaran bulan ini.
                </p>
              ) : (
                categoryExpenses.slice(0, 5).map((cat) => {
                  const percentage = monthlyExpense > 0 ? (cat.amount / monthlyExpense) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                        <span>{formatRupiah(cat.amount)} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Recent Transactions (2 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="border-border h-full shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Transaksi Terbaru</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  10 transaksi terakhir yang Anda catat
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link href="/transactions">Lihat Semua Transaksi</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <ArrowLeftRight className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">Belum ada transaksi</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Mulai mencatat pengeluaran harian atau pemasukan Anda dengan klik tombol di bawah.
                  </p>
                  <Button
                    onClick={() => setIsTxModalOpen(true)}
                    size="sm"
                    className="mt-4"
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Catat Transaksi Pertama
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentTransactions.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    const isExpense = tx.type === "EXPENSE";
                    const isTransfer = tx.type === "TRANSFER";

                    return (
                      <motion.div
                        key={tx.id}
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between py-3.5 hover:bg-muted/30 transition-colors px-2 rounded-lg"
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
                            <p className="text-sm font-medium leading-none">
                              {isTransfer
                                ? `Transfer: ${tx.wallet?.name} ➔ ${tx.destinationWallet?.name}`
                                : tx.category?.parent
                                ? `${tx.category.parent.name} ➔ ${tx.category.name}`
                                : tx.category?.name || "Tanpa Kategori"}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                              <span>{formatDateIndo(tx.date)}</span>
                              <span>•</span>
                              <span>{tx.wallet?.name}</span>
                              {tx.note && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-[150px]">{tx.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p
                              className={`text-sm font-bold ${
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
                            <Badge
                              variant={
                                isIncome ? "income" : isExpense ? "expense" : "transfer"
                              }
                              className="text-[10px] mt-1"
                            >
                              {tx.type}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setTxToView(tx)}
                            title="Lihat Detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <TransactionModal
        open={isTxModalOpen}
        onOpenChange={setIsTxModalOpen}
      />

      <TransactionDetailDialog
        transaction={txToView}
        open={!!txToView}
        onOpenChange={(open) => !open && setTxToView(null)}
      />

      <TransactionQuickFlows />
    </motion.div>
  );
}
