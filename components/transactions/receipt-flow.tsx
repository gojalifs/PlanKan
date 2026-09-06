"use client";

import { useEffect, useRef, useState } from "react";
import { ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReceipt } from "@/lib/hooks/use-receipt";
import { ReceiptUpload } from "@/lib/receipt";
import { ReceiptUploadDialog } from "./receipt-upload-dialog";
import { ReceiptTransactionsModal } from "./receipt-transactions-modal";

/**
 * Owns the receipt → multi-transaction flow on the transactions page:
 * the camera FAB, the upload dialog, and the multi-transaction dialog,
 * plus the temp-file lifecycle (deleted when the flow ends).
 */
export function ReceiptFlow() {
  const { deleteReceipt } = useReceipt();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const cancelledRef = useRef(false);

  const busy = uploadOpen || multiOpen;

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
        <Button
          onClick={handleOpenUpload}
          className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25"
          aria-label="Foto struk untuk catat banyak transaksi"
        >
          <ScanText className="h-6 w-6" />
        </Button>
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
    </>
  );
}