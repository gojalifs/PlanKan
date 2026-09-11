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
import { Loader2, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AmountInput } from "@/components/ui/amount-input";
import { Badge } from "@/components/ui/badge";
import { formatAmountNumber, parseAmountInput } from "@/lib/format";
import { useWallets } from "@/lib/hooks/use-wallets";
import { useCategories } from "@/lib/hooks/use-categories";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { CategorySelect } from "@/components/categories/category-select";
import { ReceiptUpload, formatReceiptNote } from "@/lib/receipt";
import { formatRupiah } from "@/lib/utils";
import { confidencePercent, type ReceiptItemConfidence } from "@/lib/ai-confidence";

interface ReceiptRow {
  key: string;
  itemName: string;
  categoryId: string;
  /** Category was suggested by OCR/AI and not yet changed by the user. */
  aiSuggested: boolean;
  amount: string;
  /** Harga sebelum diskon (display-only, dari OCR). */
  originalPrice: number;
  /** Potongan Rupiah pada baris ini (display-only, dari OCR). */
  discount: number;
  note: string;
  saved: boolean;
  /** Per-field OCR confidence for this item (from Gemini). */
  itemConfidence?: ReceiptItemConfidence | null;
}

interface ReceiptTransactionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptUpload | null;
  /** Compressed receipt image from the upload step — attached to row 0. */
  attachmentFile: File | null;
  /** Confidence for the shared transaction date. */
  transactionDateConfidence?: number | null;
}

/**
 * Second step of the receipt flow: one editable transaction per receipt
 * line item. Wallet & date are shared across all rows; category is pre-filled
 * from the OCR suggestion but always overridable per row. The receipt photo
 * is shown on top and attached to the top-most row on save.
 */
export function ReceiptTransactionsModal({
  open,
  onOpenChange,
  receipt,
  attachmentFile,
  transactionDateConfidence,
}: ReceiptTransactionsModalProps) {
  const { wallets } = useWallets();
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { createTransaction } = useTransactions();

  const [walletId, setWalletId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStartedSaving, setHasStartedSaving] = useState(false);

  // Seed rows + shared fields each time the dialog opens with a receipt.
  // Date comes from the receipt's transaction date; today is only the
  // fallback when the OCR found no date.
  useEffect(() => {
    if (open && receipt) {
      setWalletId((w) => w || wallets[0]?.id || "");
      setDate(receipt.transactionDate || new Date().toISOString().split("T")[0]);
      setRows(
        receipt.items.map((item) => ({
          key: item.id,
          itemName: item.name,
          categoryId: item.categoryId ?? "",
          aiSuggested: Boolean(item.categoryId),
          amount: formatAmountNumber(item.lineTotal),
          originalPrice: item.originalPrice,
          discount: item.discount,
          note: formatReceiptNote(item),
          saved: false,
          itemConfidence: item.confidence ?? null,
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
  const total = rows.reduce((acc, r) => acc + (parseAmountInput(r.amount) || 0), 0);

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
    // top-most transaction), the rest go as JSON. Rows use a stable
    // idempotency key and a verify-retry, so a save whose response was lost
    // (but committed) is detected as already-saved instead of duplicated.
    // Only a genuinely failing row stops the loop for a manual retry.
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].saved) continue;
      const row = rows[i];
      const numAmount = parseAmountInput(row.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error(`Nominal tidak valid untuk "${row.itemName}"`);
        continue;
      }
      // Stable key per row: a retry (or the verify-retry below) reuses the
      // same key, so the server returns the already-created row instead of
      // duplicating the transaction + wallet balance.
      const args = {
        type: "EXPENSE" as const,
        amount: numAmount,
        walletId,
        categoryId: row.categoryId,
        date,
        note: row.note,
        attachmentFile: i === 0 ? attachmentFile : null,
        idempotencyKey: receipt ? `${receipt.id}:${row.key}` : undefined,
        silent: true,
      };
      try {
        await createTransaction(args);
        savedCount += 1;
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, saved: true } : r)));
      } catch {
        // The response may have been lost after the server committed (e.g. a
        // proxy timeout on a cold request) — the row IS saved. One verify-retry
        // with the same idempotency key is safe: if it already persisted the
        // server returns it (alreadySaved), otherwise it creates it now. Only a
        // genuinely failing row stops the loop.
        try {
          await createTransaction(args);
          savedCount += 1;
          setRows((prev) => prev.map((r, j) => (j === i ? { ...r, saved: true } : r)));
        } catch {
          // stop on second failure; rows saved so far persist
          break;
        }
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
              {transactionDateConfidence !== null &&
                transactionDateConfidence !== undefined &&
                transactionDateConfidence < 0.5 && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  Tanggal mungkin kurang tepat ({confidencePercent(transactionDateConfidence)}%)
                </p>
              )}
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
                    <Label className="text-xs text-muted-foreground">Nominal akhir (Rp)</Label>
                    <AmountInput
                      value={row.amount}
                      onValueChange={(v) => updateRow(row.key, { amount: v })}
                      className="h-9 text-sm"
                    />
                    {/* Harga asli + diskon dari OCR — hanya tampilan */}
                    {row.discount > 0 && (
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        Harga asli{" "}
                        <span className="line-through">{formatRupiah(row.originalPrice)}</span>
                        <span className="mx-1">·</span>
                        Diskon{" "}
                        <span className="font-semibold text-emerald-600">
                          −{formatRupiah(row.discount)}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Kategori</Label>
                      {row.aiSuggested && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          Saran AI
                          {confidencePercent(row.itemConfidence?.category ?? null) && (
                            <>{" "}· {confidencePercent(row.itemConfidence?.category)}%</>
                          )}
                        </span>
                      )}
                    </div>
                    {/* Low-confidence warning for this row */}
                    {(() => {
                      const conf = row.itemConfidence;
                      if (!conf) return null;
                      const scores = [conf.name, conf.unitPrice, conf.lineTotal, conf.category].filter(
                        (s): s is number => s !== null && s !== undefined
                      );
                      if (scores.length === 0) return null;
                      const minScore = Math.min(...scores);
                      if (minScore >= 0.5) return null;
                      return (
                        <Badge variant="warning" className="gap-0.5 text-[10px] ml-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Periksa
                        </Badge>
                      );
                    })()}
                    <CategorySelect
                      categories={expenseCategories}
                      value={row.categoryId}
                      onValueChange={(v) => updateRow(row.key, { categoryId: v, aiSuggested: false })}
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

        <DialogFooter>
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