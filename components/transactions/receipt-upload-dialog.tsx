"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { useReceipt } from "@/lib/hooks/use-receipt";
import { ReceiptUpload } from "@/lib/receipt";

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires only on success; the parent decides the next step. */
  onUploaded: (receipt: ReceiptUpload, file: File) => void;
}

/**
 * First step of the receipt flow: capture (camera/gallery), preview the
 * photo, then upload. The image stays in memory here; on success the parent
 * owns the returned receipt contract + compressed File.
 */
export function ReceiptUploadDialog({ open, onOpenChange, onUploaded }: ReceiptUploadDialogProps) {
  const { uploadReceipt, isUploading } = useReceipt();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Fresh capture mode every time the dialog opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreview(null);
      setIsCompressing(false);
    }
  }, [open]);

  // Cleanup object URL on unmount / change
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      toast.error("Gagal memproses gambar");
    } finally {
      setIsCompressing(false);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const receipt = await uploadReceipt(file);
      onUploaded(receipt, file);
    } catch {
      // error toast handled inside the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Foto Struk Transaksi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!file ? (
            <div className="flex gap-2">
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
                src={preview || undefined}
                alt="Preview struk"
                className="w-full max-h-64 object-contain bg-muted"
              />
              <div className="absolute top-1.5 right-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7 rounded-full shadow-lg"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setFile(null);
                    setPreview(null);
                  }}
                  disabled={isUploading}
                  aria-label="Hapus foto"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/50">
                {file.name} · {(file.size / 1024).toFixed(0)}KB
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-primary text-primary-foreground"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengunggah...
              </>
            ) : (
              "Unggah"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}