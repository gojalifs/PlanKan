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
import { AmountInput } from "@/components/ui/amount-input";
import { formatAmountNumber, parseAmountInput } from "@/lib/format";
import { useWallets, Wallet } from "@/lib/hooks/use-wallets";
import { Loader2 } from "lucide-react";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletToEdit?: Wallet | null;
}

const COLOR_PRESETS = [
  "#10b981", // emerald
  "#0284c7", // sky/blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#64748b", // slate
];

const WALLET_TYPES = [
  { value: "CASH", label: "Tunai / Cash" },
  { value: "BANK", label: "Rekening Bank" },
  { value: "E_WALLET", label: "E-Wallet (GoPay, OVO, Dana)" },
  { value: "SAVINGS", label: "Tabungan Khusus" },
  { value: "INVESTMENT", label: "Investasi (Bibit, Stockbit)" },
  { value: "OTHER", label: "Lainnya" },
];

export function WalletModal({
  open,
  onOpenChange,
  walletToEdit,
}: WalletModalProps) {
  const { createWallet, updateWallet, isCreating, isUpdating } = useWallets();

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("BANK");
  const [balance, setBalance] = useState<string>("0");
  const [color, setColor] = useState<string>("#0284c7");
  const [isExcludedFromTotal, setIsExcludedFromTotal] = useState<boolean>(false);

  useEffect(() => {
    if (walletToEdit) {
      setName(walletToEdit.name);
      setType(walletToEdit.type);
      setBalance(formatAmountNumber(walletToEdit.balance));
      setColor(walletToEdit.color);
      setIsExcludedFromTotal(walletToEdit.isExcludedFromTotal);
    } else {
      setName("");
      setType("BANK");
      setBalance("0");
      setColor("#0284c7");
      setIsExcludedFromTotal(false);
    }
  }, [walletToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numBalance = parseAmountInput(balance) || 0;

    try {
      if (walletToEdit) {
        await updateWallet({
          id: walletToEdit.id,
          name: name.trim(),
          type,
          balance: numBalance,
          color,
          isExcludedFromTotal,
        });
      } else {
        await createWallet({
          name: name.trim(),
          type,
          balance: numBalance,
          color,
          isExcludedFromTotal,
        });
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {walletToEdit ? "Edit Dompet" : "Tambah Dompet Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-name">Nama Dompet / Rekening</Label>
            <Input
              id="wallet-name"
              placeholder="Contoh: BCA Utama, GoPay, Dompet Tunai"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipe Dompet</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe dompet" />
              </SelectTrigger>
              <SelectContent>
                {WALLET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance (Only shown/editable if creating or manual edit) */}
          <div className="space-y-1.5">
            <Label htmlFor="wallet-balance">
              {walletToEdit ? "Saldo Saat Ini (Rp)" : "Saldo Awal (Rp)"}
            </Label>
            <AmountInput
              id="wallet-balance"
              value={balance}
              onValueChange={setBalance}
              required
            />
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

          {/* Exclude from total checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="exclude-total"
              checked={isExcludedFromTotal}
              onChange={(e) => setIsExcludedFromTotal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="exclude-total" className="text-xs text-muted-foreground font-normal">
              Sembunyikan dompet ini dari perhitungan Total Kekayaan
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
              ) : walletToEdit ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Dompet"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
