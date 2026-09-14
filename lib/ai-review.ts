/**
 * Server-only AI language generator for the monthly review card.
 *
 * Produces only qualitative prose (summary + suggestions) from deterministic
 * MonthlyStats. The model is explicitly told NEVER to invent any number beyond
 * those provided in the prompt — all displayed figures come from
 * `lib/monthly-review.ts`.
 *
 * Mirrors the Gemini REST pattern in `lib/voice-parse.ts` and `lib/receipt-ocr.ts`:
 * raw fetch, `logGeminiCall`, cost accounting, 45s timeout, temperature 0.1.
 */

import {
  GEMINI_BASE_URL,
  geminiModel,
  hasGeminiKey,
} from "@/lib/receipt-ocr";
import { geminiCost, fallbackCostPerRequest } from "@/lib/monitoring";
import { logGeminiCall } from "@/lib/receipt-ocr";
import { formatRupiah } from "@/lib/utils";
import type { MonthlyStats } from "@/lib/monthly-review";

export interface AiReviewText {
  summary: string | null;
  suggestions: string[];
  source: "gemini" | "fallback";
}

function monitoringEnabled(): boolean {
  return process.env.MONITORING_ENABLED !== "false";
}

/** Build the Indonesian prompt, embedding all real figures as context. */
function buildReviewPrompt(stats: MonthlyStats): string {
  const lines = [
    "Kamu adalah asisten keuangan pribadi. Tulis ulasan bulanan keuangan pengguna dalam bahasa Indonesia.",
    "",
    "Data yang DIBERIKAN sudah akurat. JANGAN mengarang atau mengubah angka mana pun.",
    "Tugas kamu: menulis ringkasan kualitatif dan saran berdasarkan data berikut.",
    "",
    `Periode: ${stats.label}`,
    `Pemasukan: ${formatRupiah(stats.income)}`,
    `Pengeluaran: ${formatRupiah(stats.expense)}`,
    `Arus kas bersih: ${formatRupiah(stats.netCashflow)}`,
    stats.savingsRate !== null
      ? `Tingkat menabung: ${(stats.savingsRate * 100).toFixed(0)}%`
      : "Tingkat menabung: N/A (pemasukan nol)",
  ];

  if (stats.movers.up) {
    lines.push(
      `Kategori dengan pengeluaran terbesar yang NAIK: ${stats.movers.up.name} (${Math.abs(stats.movers.up.pctChange!).toFixed(0)}% naik dari periode lalu)`,
    );
  }
  if (stats.movers.down) {
    lines.push(
      `Kategori dengan pengeluaran terbesar yang TURUN: ${stats.movers.down.name} (${Math.abs(stats.movers.down.pctChange!).toFixed(0)}% turun dari periode lalu)`,
    );
  }
  if (stats.topExpenseName) {
    lines.push(`Pengeluaran terbesar: ${stats.topExpenseName}`);
  }

  lines.push(
    "",
    "ATURAN PENTING:",
    "- JANGAN menulis angka yang tidak ada di data di atas.",
    "- Hanya tulis teks kualitatif (ringkasan dan saran).",
    "",
    "Kembalikan JSON: {\"summary\": \"...\", \"suggestions\": [\"...\", \"...\"]}",
    "- summary: 1-2 kalimat ringkasan kondisi keuangan.",
    "- suggestions: 1-3 saran konkret yang bisa ditindaklanjuti.",
  );

  return lines.join("\n");
}

/**
 * Ask Gemini to produce qualitative review language, or return null summary +
 * fallback suggestions when the API key is missing. Throws on transport/API
 * errors so the caller can decide whether to persist a fallback.
 */
export async function generateMonthlyReviewText(
  stats: MonthlyStats,
): Promise<AiReviewText> {
  if (!hasGeminiKey()) {
    const { buildFallbackSuggestions } = await import("@/lib/monthly-review");
    return {
      summary: null,
      suggestions: buildFallbackSuggestions(stats),
      source: "fallback",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `${GEMINI_BASE_URL}/${geminiModel()}:generateContent`;
  const model = geminiModel();
  const start = performance.now();

  let res: Response | null = null;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildReviewPrompt(stats) }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Ringkasan singkat kondisi keuangan bulan ini dalam 1-2 kalimat.",
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "1-3 saran konkret berdasarkan data keuangan.",
              },
            },
            required: ["summary", "suggestions"],
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = json.usageMetadata?.totalTokenCount ?? promptTokens + outputTokens;

    if (monitoringEnabled()) {
      logGeminiCall({
        model,
        success: true,
        statusCode: res.status,
        durationMs: performance.now() - start,
        promptTokens,
        outputTokens,
        totalTokens,
        costUsd: geminiCost(model, promptTokens, outputTokens),
      }).catch(() => {});
    }

    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(rawText) as { summary?: string; suggestions?: string[] };
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null;
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())
      : [];

    return { summary, suggestions, source: "gemini" };
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = err?.status ?? res?.status ?? null;
    if (monitoringEnabled()) {
      logGeminiCall({
        model,
        success: false,
        statusCode: status,
        durationMs: performance.now() - start,
        promptTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: fallbackCostPerRequest(),
        errorMessage: err?.message ?? String(e),
      }).catch(() => {});
    }
    throw e;
  }
}