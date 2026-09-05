"use client";

import { useEffect, useState } from "react";
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
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWallets } from "@/lib/hooks/use-wallets";
import { useCategories } from "@/lib/hooks/use-categories";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { CategorySelect } from "@/components/categories/category-select";
import { ReceiptUpload, formatReceiptNote } from "@/lib/receipt";
import { formatRupiah } from "@/lib/utils";

interface ReceiptRow {
  key: string;
  itemName: string;
  categoryId: string;
  amount: string;
  note: string;
  saved: boolean;
}

interface ReceiptTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptUpload | null;
  /** Compressed receipt image from the upload step — attached to row 0. */
  attachmentFile: File | null;
}

/**
 * Second step of the receipt flow: one editable transaction per receipt
 * line item. Wallet & date are shared across all rows; category is chosen
 * manually per row. The receipt photo is shown on top and attached to the
 * top-most row on save.
 */
export function ReceiptTransactionsModal({
  open,
  onOpenChange,
  receipt,
  attachmentFile,
}: ReceiptTransactionsModalProps) {
  const { wallets } = useWallets();
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { createTransaction } = useTransactions();

  const [walletId, setWalletId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStartedSaving, setHasStartedSaving] = useState(false);

  // Seed rows + shared fields each time the dialog opens with a receipt
  useEffect(() => {
    if (open && receipt) {
      setWalletId((w) => w || wallets[0]?.id || "");
      setDate(new Date().toISOString().split("T")[0]);
      setRows(
        receipt.items.map((item) => ({
          key: item.id,
          itemName: item.name,
          categoryId: "",
          amount: String(item.lineTotal),
          note: formatReceiptNote(item),
          saved: false,
        }))
      );
      setIsSaving(false);
      setHasStartedSaving(false);
    }
  }, [open, receipt]);

  // Default wallet when wallets finish loading
  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  const updateRow = (key: string, patch: Partial<ReceiptRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const remainingCount = rows.filter((r) => !r.saved).length;
  const total = rows.reduce(
    (acc, r) => acc + (parseFloat(r.amount.replace(/[^0-9.]/g, "")) || 0),
    0
  );

  const handleSubmit = async () => {
    if (!walletId) {
      toast.error("Pilih dompet terlebih dahulu");
      return;
    }
    if (rows.some((r) => !r.saved && !r.categoryId)) {
      toast.error("Pilih kategori untuk setiap item struk");
      return;
    }

    setHasStartedSaving(true);
    setIsSaving(true);
    let savedCount = 0;

    // Sequential: row 0 carries the multipart attachment (lands on the
    // top-most transaction), the rest go as JSON. No automatic rollback in
    // v1 — on failure we stop and let the user retry the remaining rows.
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].saved) continue;
      const row = rows[i];
      const numAmount = parseFloat(row.amount.replace(/[^0-9.]/g, ""));
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error(`Nominal tidak valid untuk "${row.itemName}"`);
        continue;
      }
      try {
        await createTransaction({
          type: "EXPENSE",
          amount: numAmount,
          walletId,
          categoryId: row.categoryId,
          date,
          note: row.note,
          attachmentFile: i === 0 ? attachmentFile : null,
          silent: true,
        });
        savedCount += 1;
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, saved: true } : r)));
      } catch {
        // stop on first failure; rows saved so far persist
        break;
      }
    }

    setIsSaving(false);

    const failedCount = rows.filter((r) => !r.saved).length;
    if (rows.length > 0 && failedCount === 0) {
      toast.success(`${rows.length} transaksi berhasil dicatat dari struk!`);
      onOpenChange(false);
    } else if (savedCount > 0) {
      toast.error(
        `${savedCount} dari ${rows.length} transaksi tersimpan. ${failedCount} gagal — coba lagi untuk sisa item.`
      );
    } else {
      toast.error("Gagal menyimpan transaksi. Periksa kembali dan coba lagi.");
    }
  };

  const submitLabel = hasStartedSaving
    ? `Coba Lagi (sisa ${remainingCount})`
    : `Simpan ${rows.length} Transaksi`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Catat Transaksi dari Struk</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Receipt image preview (the uploaded temp photo) */}
          {receipt && (
            <img
              src={receipt.imageUrl}
              alt="Struk asli"
              className="w-full max-h-40 object-contain rounded-lg border border-border bg-muted"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}

          {/* Wallet + date shared across all rows */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-semibold">Dompet</Label>
              <Select value={walletId} onValueChange={setWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Dompet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: w.color }}
                        />
                        {w.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold">Tanggal</Label>
              <Input
                id="receipt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Rows — one transaction per item */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Item ({rows.length})</p>
              <p className="text-sm text-muted-foreground">Total {formatRupiah(total)}</p>
            </div>

            {rows.map((row, i) => (
              <div
                key={row.key}
                className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold truncate">{row.itemName}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.key)}
                    disabled={isSaving}
                    aria-label={`Hapus item ${row.itemName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nominal (Rp)</Label>
                    <Input
                      type="number"
                      step="any"
                      value={row.amount}
                      onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kategori</Label>
                    <CategorySelect
                      categories={expenseCategories}
                      value={row.categoryId}
                      onValueChange={(v) => updateRow(row.key, { categoryId: v })}
                      contentClassName="max-h-[220px]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Catatan</Label>
                  <Input
                    value={row.note}
                    onChange={(e) => updateRow(row.key, { note: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || rows.length === 0}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}