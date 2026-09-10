"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, ScanText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReceipt } from "@/lib/hooks/use-receipt";
import { ReceiptUpload } from "@/lib/receipt";
import { ReceiptUploadDialog } from "./receipt-upload-dialog";
import { ReceiptTransactionsModal } from "./receipt-transactions-modal";
import { VoiceDialog } from "./voice-dialog";

/**
 * Owns the quick-add flows on the transactions page: the camera FAB (receipt
 * OCR), the mic FAB (voice input), their dialogs, and the temp-file lifecycle
 * (deleted when the receipt flow ends). Both FABs hide whenever any flow is
 * open so they never collide with Radix dialog overlays (z-[60] vs z-50).
 */
export function TransactionQuickFlows() {
  const { deleteReceipt } = useReceipt();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const cancelledRef = useRef(false);

  const busy = uploadOpen || multiOpen || voiceOpen;

  const handleOpenUpload = () => {
    cancelledRef.current = false;
    setUploadOpen(true);
  };

  const handleUploaded = (r: ReceiptUpload, file: File) => {
    // User closed the upload dialog mid-upload: discard the temp receipt.
    if (cancelledRef.current) {
      deleteReceipt(r.id).catch(() => {});
      return;
    }
    setReceipt(r);
    setAttachmentFile(file);
    setUploadOpen(false);
    setMultiOpen(true);
  };

  // Closing the multi-tx dialog (cancel OR success) ends the flow → cleanup.
  const handleCloseMulti = (open: boolean) => {
    setMultiOpen(open);
    if (!open && receipt) {
      const id = receipt.id;
      setReceipt(null);
      setAttachmentFile(null);
      deleteReceipt(id).catch(() => {});
    }
  };

  // Best-effort cleanup when the tab is closed/reloaded mid-flow.
  useEffect(() => {
    if (!receipt) return;
    const onPageHide = () => {
      fetch(`/api/receipts/${receipt.id}`, { method: "DELETE", keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [receipt]);

  return (
    <>
      {!busy && (
        <>
          {/* Mic FAB — sits above the camera FAB (stacked vertically on mobile) */}
          <Button
            onClick={() => setVoiceOpen(true)}
            className="fixed bottom-24 right-5 z-[60] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25"
            aria-label="Catat transaksi dengan suara"
          >
            <Mic className="h-6 w-6" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary-foreground drop-shadow" />
          </Button>

          {/* Camera FAB */}
          <Button
            onClick={handleOpenUpload}
            className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25"
            aria-label="Foto struk untuk catat banyak transaksi"
          >
            <ScanText className="h-6 w-6" />
          </Button>
        </>
      )}

      <ReceiptUploadDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) cancelledRef.current = true;
          setUploadOpen(open);
        }}
        onUploaded={handleUploaded}
      />

      <ReceiptTransactionsModal
        open={multiOpen}
        onOpenChange={handleCloseMulti}
        receipt={receipt}
        attachmentFile={attachmentFile}
      />

      <VoiceDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
    </>
  );
}