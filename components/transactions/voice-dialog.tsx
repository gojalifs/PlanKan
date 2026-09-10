"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "@/components/categories/category-select";
import { AmountInput } from "@/components/ui/amount-input";
import { Loader2, Mic, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatAmountNumber, parseAmountInput } from "@/lib/format";
import { formatRupiah } from "@/lib/utils";
import { useWallets } from "@/lib/hooks/use-wallets";
import { useCategories } from "@/lib/hooks/use-categories";
import { useTransactions } from "@/lib/hooks/use-transactions";
import { useVoiceParse } from "@/lib/hooks/use-voice-parse";
import {
  isSpeechSupported,
  startListening,
  type SpeechController,
} from "@/lib/speech";
import type { VoiceDraft, VoiceType } from "@/lib/voice-types";

interface VoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Stable idempotency key — retries of the same analyze→save reuse this so
 * double-tap [Simpan] never creates two transactions. */
function makeIdempotencyKey(): string {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function idDate(d: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
    }).format(new Date(d + "T00:00:00"));
  } catch {
    return d;
  }
}

/**
 * Voice → transaction dialog. One dialog, two stages:
 *
 * 1. **Capture**: type a phrase or speak via Web Speech API; interim text
 *    streams live; [Analisis] sends it to the server for parsing.
 * 2. **Confirm**: a friendly "Saya menemukan: …" card with the parsed values,
 *    [Edit] to reveal/change the form fields, and [Simpan] to save.
 *
 * One dialog, never a stack — entry points (FAB mic and modal mic button)
 * close any other open modal before opening this one.
 */
export function VoiceDialog({ open, onOpenChange }: VoiceDialogProps) {
  const { wallets } = useWallets();
  const { categories: expenseCategories } = useCategories("EXPENSE");
  const { categories: incomeCategories } = useCategories("INCOME");
  const { createTransaction } = useTransactions();
  const { parseVoice, isParsing } = useVoiceParse();

  // ---- capture state ----
  const [stage, setStage] = useState<"capture" | "confirm">("capture");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(() => isSpeechSupported());
  const listenRef = useRef<SpeechController | null>(null);

  // ---- confirm state ----
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  // ---- editable fields ----
  const [editType, setEditType] = useState<VoiceType>("EXPENSE");
  const [editAmount, setEditAmount] = useState("");
  const [editWalletId, setEditWalletId] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDate, setEditDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [editNote, setEditNote] = useState("");

  // ---- derived lookups ----
  const matchedCategory = (
    editType === "EXPENSE" ? expenseCategories : incomeCategories
  ).find((c) => c.id === editCategoryId);
  const matchedWallet = wallets.find((w) => w.id === editWalletId);

  // ---- mic control ----
  // React state is async — by the time `onEnd` fires the latest text from
  // `onResult` may not have rendered yet. Track the latest text in a ref so
  // the auto-analyze path sees it immediately.
  const finalTextRef = useRef("");
  const manualStopRef = useRef(false);

  const stopListening = useCallback(() => {
    listenRef.current?.stop();
    listenRef.current = null;
    setListening(false);
  }, []);

  // Reset all dialog state when it closes so a reopen is always fresh.
  // Runs in the close event handler (not an effect on `open`) so the state is
  // already clean by the time the dialog re-renders on the next open.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stopListening();
      setStage("capture");
      setText("");
      setInterim("");
      setListening(false);
      setDraft(null);
      setEditing(false);
      setIdempotencyKey(null);
      setEditType("EXPENSE");
      setEditAmount("");
      setEditWalletId("");
      setEditCategoryId("");
      setEditDate(new Date().toISOString().split("T")[0]);
      setEditNote("");
    }
    onOpenChange(next);
  };

  // Clean up on unmount
  useEffect(() => () => stopListening(), [stopListening]);

  const handleToggleListen = () => {
    if (listening) {
      // Manual stop → don't auto-analyze
      manualStopRef.current = true;
      stopListening();
      return;
    }
    if (!speechSupported) {
      toast.info(
        "Rekaman suara tidak didukung di browser ini. Ketik kalimatnya saja."
      );
      return;
    }
    const controller = startListening({
      onInterim: (t) => setInterim(t),
      onResult: (final) =>
        setText((prev) => {
          const next = (prev ? prev.trimEnd() + " " : "") + final.trim();
          finalTextRef.current = next;
          return next;
        }),
      onError: (msg) => toast.error(msg),
      onEnd: () => {
        setListening(false);
        if (!manualStopRef.current) {
          const t = finalTextRef.current.trim();
          if (t) doAnalyze(t);
        }
        manualStopRef.current = false;
      },
    });
    if (controller) {
      listenRef.current = controller;
      setListening(true);
      setInterim("");
      finalTextRef.current = "";
    } else {
      toast.info(
        "Rekaman suara tidak didukung di browser ini. Ketik kalimatnya saja."
      );
    }
  };

  /** Core analysis logic — accepts a text param so both the manual button
   *  handler and the auto-analyze path can share it. */
  const doAnalyze = async (t: string) => {
    if (!t) return;
    stopListening();
    try {
      const { draft: d } = await parseVoice(t);
      setDraft(d);
      setEditType(d.type ?? "EXPENSE");
      setEditAmount(formatAmountNumber(d.amount ?? 0));
      setEditWalletId(d.walletId ?? "");
      setEditCategoryId(d.categoryId ?? "");
      setEditDate(d.date || new Date().toISOString().split("T")[0]);
      setEditNote(d.note ?? "");
      setIdempotencyKey(makeIdempotencyKey());
      setStage("confirm");
      // Auto-open the form when essentials are missing so the user can fix it
      setEditing(!d.amount || !d.walletId || !d.type);
    } catch {
      // toast already shown by useVoiceParse; stay in capture stage
    }
  };

  const handleAnalyze = () => doAnalyze(text.trim());

  const handleSave = async () => {
    const amount = parseAmountInput(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Nominal harus lebih besar dari 0");
      return;
    }
    if (!editWalletId) {
      toast.error("Pilih dompet terlebih dahulu");
      return;
    }
    try {
      await createTransaction({
        type: editType,
        amount,
        walletId: editWalletId,
        categoryId: editCategoryId || null,
        date: editDate,
        note: editNote.trim() || null,
        idempotencyKey: idempotencyKey ?? undefined,
      });
      handleOpenChange(false);
    } catch {
      // createTransaction shows its own toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        {stage === "capture" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Catat Transaksi Suara
              </DialogTitle>
              <DialogDescription>
                Ucapkan kalimat transaksi — otomatis dianalisis. Atau ketik manual lalu tekan Analisis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant={listening ? "default" : "outline"}
                  onClick={handleToggleListen}
                  className={cn(
                    "h-20 w-20 rounded-full shadow-md transition-colors",
                    listening && "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                  )}
                  aria-label={listening ? "Hentikan rekaman" : "Mulai rekam suara"}
                >
                  <Mic className="h-8 w-8" />
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {listening
                  ? "Mendengarkan… bicara sekarang"
                  : speechSupported
                    ? "Tekan mikrofon untuk mulai bicara"
                    : "Ketik kalimat transaksi di bawah"}
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  listening
                    ? "Menunggu transkripsi…"
                    : 'Contoh: "Kemarin beli bensin 50 ribu pakai BCA"'
                }
                className={cn(
                  "min-h-[100px] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                autoFocus
              />

              {/* Interim text displayed while recognition is in progress */}
              {listening && interim && (
                <p className="text-sm text-muted-foreground italic truncate">
                  {interim}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isParsing}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={isParsing || !text.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menganalisis…
                  </>
                ) : (
                  "Analisis"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Saya menemukan
                  </DialogTitle>
                  <DialogDescription>
                    {draft?.raw.note || text.trim()}
                  </DialogDescription>
                </div>
                {!editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {!editing ? (
                /* ---- summary card ---- */
                <div className="rounded-lg border border-border/80 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          matchedCategory?.color ?? "#64748b",
                      }}
                    />
                    <span className="font-semibold">
                      {matchedCategory
                        ? matchedCategory.name
                        : "Pilih kategori"}
                    </span>
                    {matchedCategory && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        Saran AI
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-bold tracking-tight">
                    {editAmount ? formatRupiah(parseAmountInput(editAmount)) : "Rp0"}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">Dompet</p>
                      {matchedWallet ? (
                        <span className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: matchedWallet.color }}
                          />
                          {matchedWallet.name}
                        </span>
                      ) : (
                        <p className="mt-0.5">Pilih dompet</p>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tanggal</p>
                      <p className="mt-0.5">{idDate(editDate)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ---- editable form ---- */
                <div className="space-y-4">
                  {/* Type tabs — v1: EXPENSE + INCOME only */}
                  <Tabs
                    value={editType}
                    onValueChange={(v) => setEditType(v as VoiceType)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="EXPENSE"
                        className="data-[state=active]:bg-rose-500 data-[state=active]:text-white gap-1.5"
                      >
                        Pengeluaran
                      </TabsTrigger>
                      <TabsTrigger
                        value="INCOME"
                        className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white gap-1.5"
                      >
                        Pemasukan
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="space-y-1.5">
                    <Label htmlFor="voice-amount">Nominal (Rp)</Label>
                    <AmountInput
                      id="voice-amount"
                      value={editAmount}
                      onValueChange={setEditAmount}
                      className="text-lg font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Dompet</Label>
                      <Select value={editWalletId} onValueChange={setEditWalletId}>
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
                      <Label>Kategori</Label>
                      <CategorySelect
                        categories={
                          editType === "EXPENSE"
                            ? expenseCategories
                            : incomeCategories
                        }
                        value={editCategoryId}
                        onValueChange={setEditCategoryId}
                        contentClassName="max-h-[280px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="voice-date">Tanggal</Label>
                    <Input
                      id="voice-date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="voice-note">Catatan</Label>
                    <Input
                      id="voice-note"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Contoh: beli bensin"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Kembali
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStage("capture")}
                >
                  Kembali
                </Button>
              )}
              <Button
                type="button"
                onClick={handleSave}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Simpan
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}