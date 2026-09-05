"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  Tag,
  Wallet as WalletIcon,
  StickyNote,
  ExternalLink,
  Clock,
} from "lucide-react";
import {
  formatRupiah,
  formatDateIndo,
  formatDateTimeIndo,
  normalizeAttachmentUrl,
} from "@/lib/utils";
import type { Transaction } from "@/lib/hooks/use-transactions";

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-sm font-medium text-right break-words min-w-0">
        {value}
      </span>
    </div>
  );
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  const attachmentUrl = normalizeAttachmentUrl(transaction.attachmentUrl);

  const isIncome = transaction.type === "INCOME";
  const isExpense = transaction.type === "EXPENSE";
  const isTransfer = transaction.type === "TRANSFER";

  const accentBar = isIncome ? "bg-emerald-500" : isExpense ? "bg-rose-500" : "bg-sky-500";

  const amountColor = isIncome
    ? "text-emerald-700 dark:text-emerald-400"
    : isExpense
    ? "text-rose-700 dark:text-rose-400"
    : "text-sky-700 dark:text-sky-400";

  const iconBg = isIncome
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : isExpense
    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
    : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";

  const title = isTransfer
    ? "Transfer"
    : isExpense
    ? "Pengeluaran"
    : "Pemasukan";

  const categoryLine = transaction.category
    ? transaction.category.parent
      ? `${transaction.category.parent.name} ➔ ${transaction.category.name}`
      : transaction.category.name
    : "Tanpa Kategori";

  const walletLine = isTransfer
    ? `${transaction.wallet?.name || "-"} ➔ ${transaction.destinationWallet?.name || "-"}`
    : transaction.wallet?.name || "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Detail Transaksi</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-1">
          {/* Amount + Type banner */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 dark:bg-muted/20">
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 w-1 ${accentBar}`}
            />
            <div className="flex items-center justify-between gap-3 p-4 pl-4">
              <div className="flex items-center gap-3 min-w-0 pl-1.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                >
                  {isIncome && <ArrowDownLeft className="h-5 w-5" />}
                  {isExpense && <ArrowUpRight className="h-5 w-5" />}
                  {isTransfer && <ArrowLeftRight className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <Badge
                      variant={
                        isIncome ? "income" : isExpense ? "expense" : "transfer"
                      }
                      className="text-[10px]"
                    >
                      {transaction.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatDateIndo(transaction.date)}
                  </p>
                </div>
              </div>
              <p className={`text-lg sm:text-xl font-extrabold tracking-tight shrink-0 ${amountColor}`}>
                {isIncome ? "+" : isExpense ? "-" : ""}
                {formatRupiah(transaction.amount)}
              </p>
            </div>
          </div>

          {/* Info rows */}
          <div className="divide-y divide-border/70 rounded-lg border border-border bg-muted/30 dark:bg-muted/20 px-3.5 py-1">
            {!isTransfer && (
              <DetailRow
                icon={Tag}
                label="Kategori"
                value={categoryLine}
              />
            )}
            <DetailRow
              icon={WalletIcon}
              label={isTransfer ? "Transfer Dana" : "Dompet"}
              value={walletLine}
            />
            <DetailRow
              icon={Calendar}
              label="Tanggal"
              value={formatDateIndo(transaction.date)}
            />
            {transaction.note && (
              <DetailRow icon={StickyNote} label="Catatan" value={transaction.note} />
            )}
            <DetailRow
              icon={Clock}
              label="Dicatat"
              value={formatDateTimeIndo(transaction.createdAt)}
            />
          </div>

          {/* Attachment */}
          {attachmentUrl && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Lampiran
              </p>
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-lg border border-border bg-muted"
              >
                <img
                  src={attachmentUrl}
                  alt="Lampiran transaksi"
                  className="w-full max-h-60 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <span className="flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Buka di tab baru
                  </span>
                </span>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}