/**
 * Shared types for the voice → single-transaction flow.
 *
 * This is the single contract between the voice parse API, the client hook
 * and the voice dialog. Deliberately client-safe: no prisma, no `process.env`
 * — so both the server route and the `"use client"` dialog can import it.
 *
 * The LLM returns names, not ids (the transaction API is id-based), so the
 * server resolves names → ids and hands the dialog a ready-to-save `draft`.
 * Anything the server could not resolve is `null` and the user picks it in
 * the confirm form.
 */

import type { VoiceConfidence } from "@/lib/ai-confidence";

/** Type of transaction the voice parser may produce. TRANSFER stays out of
 * scope for v1 (the manual modal already handles it). */
export type VoiceType = "INCOME" | "EXPENSE";

/** What Gemini's `record_transaction` function call returned — names, raw.
 * `null` / "" means "something the model did not find"; normalization to
 * plain `null` happens server-side. */
export interface VoiceDraftRaw {
  type: string | null;
  amount: number | null;
  walletName: string | null;
  categoryPath: string | null;
  date: string | null;
  note: string | null;
  /** Raw per-field confidence the model reported (undefined = it omitted it;
   * the dialog hides the badge instead of showing a made-up number). */
  confidence?: VoiceConfidence | null;
}

/** `VoiceDraftRaw` after server-side normalization — `type` narrowed to the
 * enum so `resolveDraft` never hands a raw string to the client. */
export type NormalizedVoiceDraftRaw = Omit<VoiceDraftRaw, "type"> & {
  type: VoiceType | null;
};

/** Ready-to-save draft returned by POST /api/voice. */
export interface VoiceDraft {
  /** Raw model output, kept for debugging / "apa yang dipahami". */
  raw: VoiceDraftRaw;
  type: VoiceType | null;
  amount: number | null;
  /** Resolved wallet id; null when nothing matched → user picks. */
  walletId: string | null;
  /** Resolved wallet display name (from the user's wallet list). */
  walletName: string | null;
  /** Resolved category id; null when nothing matched. */
  categoryId: string | null;
  /** Resolved category display label ("Parent > Child"). */
  categoryName: string | null;
  /** Always "YYYY-MM-DD" (validated server-side, defaults to today). */
  date: string;
  note: string | null;
  /** Normalized per-field confidence from the model (null = not provided).
   * Display-only: drives percentage badges and low-confidence warnings. */
  confidence?: VoiceConfidence | null;
}

export interface VoiceParseResponse {
  draft: VoiceDraft;
}