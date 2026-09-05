"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { useWallets } from "@/lib/hooks/use-wallets";
import { useCategories } from "@/lib/hooks/use-categories";
import { useTransactions, Transaction } from "@/lib/hooks/use-transactions";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2, Camera, Image as ImageIcon, X, RotateCwSquare } from "lucide-react";
import { toast } from "sonner";

/**
 * Compress an image file to max ~1MB using Canvas API, optionally rotated.
 * Returns a new File object (JPEG, quality-adjusted).
 */
async function compressImage(
  file: File,
  maxBytes = 1 * 1024 * 1024,
  rotation: 0 | 90 | 180 | 270 = 0
): Promise<File> {
  const needsRotate = rotation % 360 !== 0;

  // Skip re-encoding entirely if it already fits and needs no rotation
  if (!needsRotate && file.size <= maxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const sw = bitmap.width;
  const sh = bitmap.height;

  // Scale down large images (helps compression)
  let w = sw;
  let h = sh;
  const maxDim = 2048;
  if (Math.max(w, h) > maxDim) {
    const ratio = maxDim / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const rotated = rotation % 180 !== 0;
  canvas.width = rotated ? h : w;
  canvas.height = rotated ? w : h;

  // Draw centered, scaled to the target size, then rotate
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(w / sw, h / sh);
  ctx.drawImage(bitmap, -sw / 2, -sh / 2);
  bitmap.close();

  // Binary search for quality that fits under maxBytes
  let lo = 0.1;
  let hi = 0.92;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", mid)
    );
    bestBlob = blob;
    if (blob.size > maxBytes) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Final pass with lowest quality found
  const finalBlob = bestBlob!;
  const ext = finalBlob.size <= maxBytes ? ".jpg" : ".jpg";
  return new File([finalBlob], file.name.replace(/\.[^.]+$/, ext), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
}

export function TransactionModal({
  open,
  onOpenChange,
  transactionToEdit,
}: TransactionModalProps) {
  const { wallets } = useWallets();
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { categories: incomeCategories } = useCategories("INCOME");
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useTransactions();

  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState<string>("");
  const [walletId, setWalletId] = useState<string>("");
  const [destinationWalletId, setDestinationWalletId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reset form & attachment when modal opens/closes
  useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        setType(transactionToEdit.type);
        setAmount(String(transactionToEdit.amount));
        setWalletId(transactionToEdit.walletId);
        setDestinationWalletId(transactionToEdit.destinationWalletId || "");
        setCategoryId(transactionToEdit.categoryId || "");
        setDate(new Date(transactionToEdit.date).toISOString().split("T")[0]);
        setNote(transactionToEdit.note || "");
      } else {
        // Default reset
        setType("EXPENSE");
        setAmount("");
        if (wallets.length > 0 && !walletId) {
          setWalletId(wallets[0].id);
        }
        setDestinationWalletId("");
        setCategoryId("");
        setDate(new Date().toISOString().split("T")[0]);
        setNote("");
      }
      // Always clear attachment on open
      setAttachmentFile(null);
      setAttachmentPreview(null);
      setRotation(0);
    }
  }, [transactionToEdit, open, wallets]);

  // Set default wallet if empty
  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id);
    }
  }, [wallets, walletId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(raw);
      const sizeKb = (compressed.size / 1024).toFixed(1);
      if (compressed.size < raw.size) {
        toast.info(`Gambar dikompres: ${(raw.size / 1024 / 1024).toFixed(2)}MB → ${sizeKb}KB`);
      }
      setRotation(0);
      setAttachmentFile(compressed);
      const preview = URL.createObjectURL(compressed);
      setAttachmentPreview(preview);
    } catch {
      toast.error("Gagal memproses gambar");
    } finally {
      setIsCompressing(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  // Rotate the current attachment +90° (re-encodes so the uploaded file is rotated, not just the preview)
  const rotateAttachment = async () => {
    if (!attachmentFile) return;

    setIsCompressing(true);
    try {
      const rotatedFile = await compressImage(attachmentFile, 1 * 1024 * 1024, 90);
      setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270);
      setAttachmentFile(rotatedFile);
      const preview = URL.createObjectURL(rotatedFile);
      setAttachmentPreview(preview);
    } catch {
      toast.error("Gagal memutar gambar");
    } finally {
      setIsCompressing(false);
    }
  };

  const removeAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setRotation(0);
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    if (!walletId) {
      return;
    }

    if (type === "TRANSFER" && (!destinationWalletId || destinationWalletId === walletId)) {
      return;
    }

    try {
      if (transactionToEdit) {
        await updateTransaction({
          id: transactionToEdit.id,
          type,
          amount: numAmount,
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId || null : null,
          date,
          note,
        });
      } else {
        await createTransaction({
          type,
          amount: numAmount,
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId || null : null,
          date,
          note,
          attachmentFile,
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {transactionToEdit ? "Edit Transaksi" : "Catat Transaksi Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Transaction Type Tabs */}
          <Tabs
            value={type}
            onValueChange={(val) => setType(val as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="EXPENSE"
                className="data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-1.5"
              >
                <ArrowUpRight className="h-4 w-4" />
                Pengeluaran
              </TabsTrigger>
              <TabsTrigger
                value="INCOME"
                className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-1.5"
              >
                <ArrowDownLeft className="h-4 w-4" />
                Pemasukan
              </TabsTrigger>
              <TabsTrigger
                value="TRANSFER"
                className="data-[state=active]:bg-sky-500 data-[state=active]:text-white gap-1.5"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Transfer
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Field */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Nominal (Rp)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-semibold text-muted-foreground">
                Rp
              </span>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg font-bold"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Wallet Selection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{type === "TRANSFER" ? "Dari Dompet (Asal)" : "Dompet"}</Label>
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

            {/* Destination Wallet for Transfer */}
            {type === "TRANSFER" && (
              <div className="space-y-1.5">
                <Label>Ke Dompet (Tujuan)</Label>
                <Select
                  value={destinationWalletId}
                  onValueChange={setDestinationWalletId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Dompet Tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => (
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
            )}

            {/* Category for Expense/Income */}
            {type !== "TRANSFER" && (
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {(() => {
                      const list = type === "EXPENSE" ? expenseCategories : incomeCategories;
                      const parents = list.filter((c) => !c.parentId);
                      return parents.map((parent) => {
                        const children = list.filter((c) => c.parentId === parent.id);
                        return (
                          <React.Fragment key={parent.id}>
                            <SelectItem value={parent.id} className="font-semibold text-xs py-1.5">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: parent.color }}
                                />
                                {parent.name}
                              </span>
                            </SelectItem>
                            {children.map((sub) => (
                              <SelectItem
                                key={sub.id}
                                value={sub.id}
                                className="text-xs pl-7 py-1 text-muted-foreground hover:text-foreground"
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: sub.color || parent.color }}
                                  />
                                  ↳ {sub.name}
                                </span>
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Note / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="note">Catatan (Opsional)</Label>
            <Input
              id="note"
              placeholder="Contoh: Makan siang di warung, bayar wifi..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Attachment: Camera / Gallery */}
          <div className="space-y-1.5">
            <Label>Lampiran (Opsional)</Label>
            {!attachmentPreview ? (
              <div className="flex gap-2">
                {/* Hidden inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={isCompressing}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {isCompressing ? "Memproses..." : "Foto Kamera"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={isCompressing}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                  {isCompressing ? "Memproses..." : "Pilih dari Galeri"}
                </Button>
              </div>
            ) : (
              <div className="relative rounded-lg border border-border overflow-hidden">
                <img
                  src={attachmentPreview}
                  alt="Preview lampiran"
                  className="w-full max-h-48 object-contain bg-muted"
                />
                <div className="absolute top-1.5 left-1.5 flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 rounded-full shadow-lg"
                    onClick={rotateAttachment}
                    disabled={isCompressing}
                    title={`Putar ${rotation}°`}
                  >
                    <RotateCwSquare className={`h-3.5 w-3.5 ${isCompressing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <div className="absolute top-1.5 right-1.5">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-full shadow-lg"
                    onClick={removeAttachment}
                    disabled={isCompressing}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50">
                  {attachmentFile?.name} · {(attachmentFile!.size / 1024).toFixed(0)}KB
                  {rotation !== 0 && ` · ${rotation}°`}
                </div>
              </div>
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                type === "EXPENSE"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : type === "INCOME"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : transactionToEdit ? (
                "Simpan Perubahan"
              ) : (
                "Simpan Transaksi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
