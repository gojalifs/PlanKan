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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAmountNumber, parseAmountInput } from "@/lib/format";
import { useWallets, Wallet } from "@/lib/hooks/use-wallets";
import { WALLET_TEMPLATE_GROUPS, WalletTemplate } from "@/lib/wallet-templates";
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const {
    createWallet,
    createWallets,
    updateWallet,
    isCreating,
    isCreatingMany,
    isUpdating,
  } = useWallets();

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("BANK");
  const [balance, setBalance] = useState<string>("0");
  const [color, setColor] = useState<string>("#0284c7");
  const [isExcludedFromTotal, setIsExcludedFromTotal] = useState<boolean>(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [tab, setTab] = useState("manual");

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
    setTemplateQuery("");
    setSelectedTemplateIds([]);
    setTab("manual");
  }, [walletToEdit, open]);

  const filteredTemplateGroups = WALLET_TEMPLATE_GROUPS.map((group) => ({
    ...group,
    templates: group.templates.filter((t) =>
      t.name.toLowerCase().includes(templateQuery.trim().toLowerCase())
    ),
  })).filter((group) => group.templates.length > 0);

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const selectedTemplates = WALLET_TEMPLATE_GROUPS.flatMap((g) => g.templates).filter((t) =>
    selectedTemplateIds.includes(t.id)
  );

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

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTemplates.length === 0) return;

    try {
      await createWallets(
        selectedTemplates.map((t: WalletTemplate) => ({
          name: t.name,
          type: t.type,
          balance: 0,
          color: t.color,
          icon: t.type === "E_WALLET" ? "Smartphone" : "Building2",
          isExcludedFromTotal: false,
        }))
      );
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const isSubmitting = isCreating || isCreatingMany || isUpdating;

  const isTemplateMode = !walletToEdit && tab === "template";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isTemplateMode ? "sm:max-w-[560px]" : "sm:max-w-[440px]"}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {walletToEdit ? "Edit Dompet" : "Tambah Dompet Baru"}
          </DialogTitle>
        </DialogHeader>

        {walletToEdit ? (
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
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
        ) : (
        <Tabs value={tab} onValueChange={setTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="template">Dari Template</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="wallet-name">Nama Dompet / Rekening</Label>
                <Input
                  id="wallet-name"
                  placeholder="Contoh: BCA Utama, GoPay, Dompet Tunai"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="wallet-balance">Saldo Awal (Rp)</Label>
                <AmountInput
                  id="wallet-balance"
                  value={balance}
                  onValueChange={setBalance}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Warna Tema</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        color === c
                          ? "scale-125 ring-2 ring-primary ring-offset-2"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="exclude-total-manual"
                  checked={isExcludedFromTotal}
                  onChange={(e) => setIsExcludedFromTotal(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label
                  htmlFor="exclude-total-manual"
                  className="text-xs text-muted-foreground font-normal"
                >
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
                  ) : (
                    "Tambah Dompet"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="template">
            <form onSubmit={handleTemplateSubmit} className="space-y-4 pt-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Cari bank atau e-wallet..."
                  className="h-9 pl-8 text-sm"
                />
              </div>

              <div className="max-h-[300px] space-y-4 overflow-y-auto pr-1">
                {filteredTemplateGroups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada template yang cocok dengan &quot;{templateQuery}&quot;.
                  </p>
                ) : (
                  filteredTemplateGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold">{group.label}</p>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.templates.map((t) => {
                          const isSelected = selectedTemplateIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTemplate(t.id)}
                              aria-pressed={isSelected}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                                isSelected
                                  ? "border-primary bg-primary/5 font-medium"
                                  : "border-border hover:bg-muted/60"
                              )}
                            >
                              <span
                                aria-hidden
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: t.color }}
                              />
                              <span className="min-w-0 flex-1 truncate">{t.name}</span>
                              {isSelected ? (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
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
                <Button type="submit" disabled={isSubmitting || selectedTemplates.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : selectedTemplates.length === 0 ? (
                    "Pilih Template"
                  ) : (
                    `Tambah ${selectedTemplates.length} Dompet`
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
