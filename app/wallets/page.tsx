"use client";

import React, { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useWallets, Wallet } from "@/lib/hooks/use-wallets";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletModal } from "@/components/wallets/wallet-modal";
import {
  Wallet as WalletIcon,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Banknote,
  Smartphone,
  TrendingUp,
  PiggyBank,
  CircleEllipsis,
  EyeOff,
  Loader2,
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
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function getWalletIcon(type: string) {
  switch (type) {
    case "BANK":
      return <Building2 className="h-5 w-5" />;
    case "CASH":
      return <Banknote className="h-5 w-5" />;
    case "E_WALLET":
      return <Smartphone className="h-5 w-5" />;
    case "INVESTMENT":
      return <TrendingUp className="h-5 w-5" />;
    case "SAVINGS":
      return <PiggyBank className="h-5 w-5" />;
    default:
      return <CircleEllipsis className="h-5 w-5" />;
  }
}

function getWalletTypeLabel(type: string) {
  switch (type) {
    case "BANK":
      return "Rekening Bank";
    case "CASH":
      return "Kas / Tunai";
    case "E_WALLET":
      return "E-Wallet";
    case "INVESTMENT":
      return "Investasi";
    case "SAVINGS":
      return "Tabungan";
    default:
      return "Lainnya";
  }
}

export default function WalletsPage() {
  const { data: session, isPending: isAuthPending } = useSession();
  const router = useRouter();
  const { wallets, totalBalance, isLoading, deleteWallet, isDeleting } = useWallets();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

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

  const handleEdit = (w: Wallet) => {
    setWalletToEdit(w);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setWalletToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!walletToDelete) return;
    await deleteWallet(walletToDelete.id);
    setWalletToDelete(null);
  };

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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kelola Dompet & Akun
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur rekening bank, e-wallet, kas tunai, dan akun finansial Anda.
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button onClick={handleOpenAdd} className="flex items-center gap-1.5 shadow-sm shadow-primary/20">
            <Plus className="h-4 w-4" />
            Tambah Dompet Baru
          </Button>
        </motion.div>
      </motion.div>

      {/* Summary Banner */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-xs">
            <CardContent className="p-6">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Total Saldo Terhitung
              </span>
              <div className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
                {isLoading ? "..." : formatRupiah(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dari {wallets.filter((w) => !w.isExcludedFromTotal).length} dompet aktif utama
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <Card className="border-border shadow-xs">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Jumlah Akun Terdaftar
                </span>
                <div className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
                  {isLoading ? "..." : `${wallets.length} Dompet`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-rekening & e-wallet
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <WalletIcon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Wallets Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-semibold mb-4">Daftar Dompet</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-44 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
              <WalletIcon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">Belum Ada Dompet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Tambahkan dompet pertama Anda seperti BCA, Mandiri, GoPay, atau Kas Tunai.
            </p>
            <Button onClick={handleOpenAdd} className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Tambah Sekarang
            </Button>
          </Card>
        ) : (
          <motion.div
            layout
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {wallets.map((wallet) => (
                <motion.div
                  layout
                  key={wallet.id}
                  variants={itemVariants}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="h-full"
                >
                  <Card className="relative overflow-hidden border-border/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full">
                    {/* Top color indicator bar */}
                    <div
                      className="h-2 w-full"
                      style={{ backgroundColor: wallet.color }}
                    />

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                            style={{ backgroundColor: wallet.color }}
                          >
                            {getWalletIcon(wallet.type)}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold">
                              {wallet.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {getWalletTypeLabel(wallet.type)}
                            </p>
                          </div>
                        </div>

                        {wallet.isExcludedFromTotal && (
                          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                            <EyeOff className="h-3 w-3" />
                            Tersembunyi
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Saldo Dompet:</span>
                        <div className="text-2xl font-bold tracking-tight mt-0.5">
                          {formatRupiah(wallet.balance)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <span>
                          {(wallet._count?.transactions || 0) + (wallet._count?.transfersIn || 0)} transaksi
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleEdit(wallet)}
                            title="Edit Dompet"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => setWalletToDelete(wallet)}
                            title="Hapus Dompet"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>

      {/* Add / Edit Modal */}
      <WalletModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        walletToEdit={walletToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!walletToDelete}
        onOpenChange={(open) => !open && setWalletToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive">
              Hapus Dompet
            </DialogTitle>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus dompet{" "}
              <span className="font-semibold text-foreground">
                "{walletToDelete?.name}"
              </span>
              ? Riwayat transaksi yang terhubung dengan dompet ini juga akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setWalletToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Dompet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
