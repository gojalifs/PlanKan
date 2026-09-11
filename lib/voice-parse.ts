/**
 * Server-only voice → transaction parser.
 *
 * Turns a spoken/typed phrase ("Kemarin beli bensin 50 ribu pakai BCA") into
 * a ready-to-save `VoiceDraft` by asking Gemini to *call* the
 * `record_transaction` function (declarative function calling), then resolving
 * the wallet/category *names* the model returned to real user ids.
 *
 * Mirrors the receipt-OCR module: same raw REST fetch to Gemini, same
 * monitoring/log shape, defensive normalizers. It intentionally does NOT
 * import the client (`"use client"` files must never import this module —
 * it reads `process.env`).
 */

import {
  GEMINI_BASE_URL,
  geminiModel,
  logGeminiCall,
  ReceiptCategory,
  categoryLabel,
  resolveCategoryId,
} from "@/lib/receipt-ocr";
import { fallbackCostPerRequest, geminiCost } from "@/lib/monitoring";
import {
  VoiceDraft,
  NormalizedVoiceDraftRaw,
  VoiceType,
} from "@/lib/voice-types";
import { normalizeVoiceConfidence } from "@/lib/ai-confidence";

/** What the parser needs to know about the user's world: their wallets and
 * categories. Fetched by the route, passed in so this module stays pure. */
export interface VoiceContext {
  wallets: { id: string; name: string }[];
  categories: ReceiptCategory[];
}

const PAD = (n: number) => String(n).padStart(2, "0");
export function localTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

/** Lowercase, strip punctuation/whitespace for forgiving name matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The `record_transaction` function the model must call. */
const RECORD_TRANSACTION = {
  name: "record_transaction",
  description:
    "Nyatakan satu transaksi keuangan dari ucapan pengguna sebagai pemanggilan fungsi.",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["INCOME", "EXPENSE"],
        description:
          "EXPENSE untuk pengeluaran, INCOME untuk pemasukan. Jika ragu, pilih EXPENSE.",
      },
      amount: {
        type: "number",
        description:
          "Nominal dalam Rupiah, angka positif TANPA simbol atau pemisah ribuan (contoh: 50000).",
      },
      walletName: {
        type: "string",
        description:
          "Nama dompet PERSIS dari daftar yang disediakan, atau string kosong jika tidak ada yang cocok. JANGAN menciptakan nama baru.",
      },
      categoryPath: {
        type: "string",
        description:
          "Path kategori PERSIS dari daftar yang disediakan (format 'Parent > Child'), atau string kosong jika tidak ada yang cocok.",
      },
      date: {
        type: "string",
        description:
          "Tanggal transaksi format YYYY-MM-DD. Kata relatif ('hari ini', 'kemarin', 'tgl 5') dihitung dari tanggal yang diberikan.",
      },
      note: {
        type: "string",
        description: "Catatan singkat transaksi; boleh string kosong (\"\").",
      },
      confidence: {
        type: "object",
        description:
          "Skor keyakinan 0-1 untuk setiap field. Kirim objek dengan: type, amount, wallet, category, date, note. Jika yakin → 0.9-1.0, ragu → 0.5, sangat ragu → 0.2.",
        properties: {
          type: { type: "number", description: "Keyakinan untuk tipe transaksi (0-1)." },
          amount: { type: "number", description: "Keyakinan untuk nominal (0-1)." },
          wallet: { type: "number", description: "Keyakinan untuk pemilihan dompet (0-1)." },
          category: { type: "number", description: "Keyakinan untuk pemilihan kategori (0-1)." },
          date: { type: "number", description: "Keyakinan untuk tanggal (0-1)." },
          note: { type: "number", description: "Keyakinan untuk catatan (0-1)." },
        },
        // Not in required — model may omit the entire confidence object
      },
    },
    required: ["type", "amount", "walletName", "categoryPath", "date", "note"],
  },
};

/**
 * Build the voice prompt, listing the user's wallets + categories so the
 * model can only pick from real names, and giving it the current date so
 * relative words ("kemarin", "tgl 5") resolve deterministically.
 */
export function buildVoicePrompt(text: string, ctx: VoiceContext): string {
  const now = new Date();
  const todayISO = localTodayISO();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayISO = `${yesterday.getFullYear()}-${PAD(yesterday.getMonth() + 1)}-${PAD(yesterday.getDate())}`;
  const weekday = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(now);

  const lines = [
    `Hari ini: ${todayISO} (${weekday}).`,
    "Ubah kalimat pengguna berikut menjadi SATU pemanggilan fungsi record_transaction.",
    "",
    `Kalimat pengguna: "${text}"`,
    "",
    "Aturan:",
    "- type: EXPENSE untuk pengeluaran, INCOME untuk pemasukan. Jika ragu, pilih EXPENSE.",
    "- amount: nominal dalam Rupiah, angka positif TANPA simbol atau pemisah ribuan (contoh: 50000).",
    "- walletName: pilih PERSIS salah satu nama dompet dari daftar di bawah.",
    '  Jika TIDAK ada yang cocok, isi string kosong "". JANGAN mengarang nama dompet baru.',
    "- categoryPath: pilih PERSIS salah satu path kategori dari daftar di bawah",
    "  (format 'Parent > Child'). Jika TIDAK ada yang cocok, isi string kosong \"\".",
    "- date: tanggal transaksi format YYYY-MM-DD. Kata relatif dihitung dari 'Hari ini':",
    `  'hari ini' → ${todayISO}; 'kemarin' → ${yesterdayISO}; tanggal tanpa tahun dianggap bulan ini.`,
    "- note: catatan singkat transaksi; boleh string kosong.",
    "- confidence: kirim objek confidence dengan skor 0-1 untuk setiap field (type, amount, wallet, category, date, note). Sangat yakin → 0.9-1.0; ragu → 0.5; sangat ragu → 0.2.",
    "",
  ];

  if (ctx.wallets.length > 0) {
    lines.push("Daftar dompet user:");
    for (const w of ctx.wallets) lines.push(`- ${w.name}`);
    lines.push("");
  }
  if (ctx.categories.length > 0) {
    lines.push("Daftar kategori user:");
    for (const c of ctx.categories) lines.push(`- ${categoryLabel(c)}`);
  }

  return lines.join("\n");
}

/**
 * Pull the function call part out of a Gemini response. The model was forced
 * into calling via `toolConfig.functionCallingConfig.mode: "ANY"`, so the
 * first part with a `functionCall` is the transaction. Throws otherwise.
 */
export function extractFunctionCall(
  json: unknown
): { name: string; args: Record<string, unknown> } {
  const body = (json ?? {}) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ functionCall?: { name?: string; args?: unknown } }>;
      };
    }>;
  };
  const parts = body.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const call = part.functionCall;
    if (call?.name) {
      return {
        name: call.name,
        args: (call.args ?? {}) as Record<string, unknown>,
      };
    }
  }
  throw new Error("Gemini tidak mengembalikan pemanggilan fungsi record_transaction");
}

/** Sanitize the raw function args into a safe, normalized
 * `NormalizedVoiceDraftRaw`.
 * Empty strings → null, invalid/missing values → null (never crash). */
export function normalizeDraft(raw: unknown): NormalizedVoiceDraftRaw {
  const r = (raw ?? {}) as Record<string, unknown>;
  const toStr = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const typeRaw = toStr(r.type);
  const type: VoiceType | null =
    typeRaw === "INCOME" ? "INCOME" : typeRaw === "EXPENSE" ? "EXPENSE" : null;

  let amountRaw: number | null = null;
  if (typeof r.amount === "number") amountRaw = r.amount;
  else if (typeof r.amount === "string") {
    const n = Number(r.amount.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) amountRaw = n;
  }
  const amount = amountRaw !== null && Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : null;

  // Date must be a real calendar date in YYYY-MM-DD; anything else → null
  // (the dialog falls back to today when saving).
  let date = toStr(r.date);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map((x) => Number(x));
    const dt = new Date(y, m - 1, d);
    const valid = dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    if (!valid) date = null;
  } else {
    date = null;
  }

  return {
    type,
    amount,
    walletName: toStr(r.walletName),
    categoryPath: toStr(r.categoryPath),
    date,
    note: toStr(r.note),
    confidence: normalizeVoiceConfidence(r.confidence),
  };
}

/** Resolve a spoken wallet name to a real wallet (exact → substring, both
 * directions). Returns the matched id + display name, or null. */
export function resolveWalletId(
  walletName: string | null,
  wallets: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (!walletName) return null;
  const target = normalize(walletName);
  if (!target) return null;

  const entries = wallets.map((w) => ({
    id: w.id,
    label: w.name,
    name: normalize(w.name),
  }));
  for (const e of entries) if (e.name === target) return { id: e.id, name: e.label };
  for (const e of entries) {
    if (target.includes(e.name) || e.name.includes(target)) return { id: e.id, name: e.label };
  }
  return null;
}

/** Turn a raw draft into the ready-to-save shape, resolving names → ids. A
 * field the model couldn't map stays `null` so the confirm form asks the user
 * (no silent default to the first wallet). */
export function resolveDraft(raw: NormalizedVoiceDraftRaw, ctx: VoiceContext): VoiceDraft {
  const wallet = resolveWalletId(raw.walletName, ctx.wallets);
  const categoryId = resolveCategoryId(raw.categoryPath, ctx.categories);
  const category = ctx.categories.find((c) => c.id === categoryId) ?? null;

  return {
    raw,
    type: raw.type,
    amount: raw.amount,
    walletId: wallet?.id ?? null,
    walletName: wallet?.name ?? null,
    categoryId,
    categoryName: category ? categoryLabel(category) : null,
    date: raw.date ?? localTodayISO(),
    note: raw.note,
    confidence: raw.confidence ?? null,
  };
}

function monitoringEnabled(): boolean {
  return process.env.MONITORING_ENABLED !== "false";
}

/**
 * Ask Gemini to parse a phrase into a `record_transaction` function call,
 * then resolve it. Throws on transport/API/missing-function errors. Each call
 * is logged to GeminiCallLog for AI cost tracking, same as receipt OCR.
 */
export async function parseVoiceTranscript(
  text: string,
  ctx: VoiceContext
): Promise<VoiceDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset");

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
        contents: [{ role: "user", parts: [{ text: buildVoicePrompt(text, ctx) }] }],
        tools: [{ functionDeclarations: [RECORD_TRANSACTION] }],
        toolConfig: { functionCallingConfig: { mode: "ANY" } },
        generationConfig: { temperature: 0.1 },
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
        content?: { parts?: Array<{ functionCall?: { name?: string; args?: unknown } }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const prompt = json.usageMetadata?.promptTokenCount ?? 0;
    const output = json.usageMetadata?.candidatesTokenCount ?? 0;
    const total = json.usageMetadata?.totalTokenCount ?? prompt + output;
    if (monitoringEnabled()) {
      logGeminiCall({
        model,
        success: true,
        statusCode: res.status,
        durationMs: performance.now() - start,
        promptTokens: prompt,
        outputTokens: output,
        totalTokens: total,
        costUsd: geminiCost(model, prompt, output),
      }).catch(() => {});
    }

    const call = extractFunctionCall(json);
    if (call.name !== "record_transaction") {
      throw new Error("Gemini tidak mengembalikan fungsi record_transaction");
    }

    return resolveDraft(normalizeDraft(call.args), ctx);
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