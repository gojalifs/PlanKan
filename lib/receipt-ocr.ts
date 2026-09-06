import { ReceiptItem } from "@/lib/receipt";
import { getReceiptStub } from "@/lib/receipt-stub";

/**
 * Gemini Vision OCR for receipt photos.
 *
 * Uses the Google AI `generateContent` REST API (model defaults to
 * `gemini-3.5-flash-lite`, the cheap vision-native tier). The model is asked
 * to return a strict JSON object `{ items: [...] }` via `responseSchema`, so
 * the only thing bridgeing Gemini to the app is the tolerant parser below.
 *
 * The parse step is intentionally defensive: Gemini is asked for plain
 * numbers/strings but reliably returns things like `qty: "2"` or
 * `unitPrice: "Rp 15.000"`, and a bad photo may produce an empty list rather
 * than an error. Nothing in here should be able to crash the upload flow.
 */

export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** A user category, in the shape the OCR step needs to match items against. */
export interface ReceiptCategory {
  id: string;
  name: string;
  parentName?: string | null;
}

/** Human-readable label for a category in the prompt ("Parent > Child"). */
function categoryLabel(c: ReceiptCategory): string {
  return c.parentName ? `${c.parentName} > ${c.name}` : c.name;
}

/**
 * Build the OCR prompt, appending the user's category list so the model can
 * suggest a best-match category per line item. Items the model cannot map to
 * any category return an empty categoryName and are left for manual choice.
 */
function buildPrompt(categories: ReceiptCategory[]): string {
  const lines = [
    "Foto struk belanja. Ekstrak SEMUA baris item ke dalam JSON.",
    "Untuk setiap item:",
    "- name: nama barang (string)",
    "- qty: jumlah (angka, default 1 jika tidak tertulis)",
    '- unit: satuan kemasan seperti "pcs", "1kg", "lusin", atau string kosong jika tidak ada',
    "- unitPrice: harga SATU satuan dalam Rupiah (angka, SELALU positif)",
    "- discount: potongan Rupiah yang diberikan pada baris ini (0 jika tidak ada)",
    "- lineTotal: harga FINAL baris setelah diskon (angka; untuk baris normal = qty × unitPrice − discount)",
    "- categoryName: kategori yang paling cocok untuk item ini (lihat daftar di bawah)",
    "",
    "PENTING — KATEGORI:",
    "Cocokkan SETIAP item ke SALAH SATU kategori dari daftar user berikut.",
    "Pilih kategori yang paling spesifik; untuk sub-kategori tulis lengkap 'Parent > Child'.",
    "Jika tidak ada kategori yang cocok, isi categoryName dengan string kosong.",
    "",
  ];

  if (categories.length > 0) {
    lines.push("Daftar kategori user:");
    for (const c of categories) lines.push(`- ${categoryLabel(c)}`);
    lines.push("");
  }

  lines.push(
    "PENTING — DOKUMENTASI DISKON:",
    "- Layout diskon berbeda-beda antar toko. Tangkap diskon dari kolom apapun itu:",
    "  kolom 'DISK', 'DISC', 'POT', 'potongan', harga coret, atau baris minus.",
    "- Jangan hilangkan baris diskon/voucher/potongan. Baris yang merupakan potongan murni",
    "  (tanpa nama barang, bernilai negatif) tampilkan sebagai item dengan name 'Diskon'",
    "  dan lineTotal NEGATIF, mis. name='Diskon', lineTotal=-2500.",
    "- Harga yang dicoret/dipotong per barang: masuk ke discount dan lineTotal terkoreksi.",
    "- lineTotal negatif HANYA untuk baris potongan murni; jangan pernah negatif lainnya.",
    "- JANGAN MENEBAK DISKON. discount=0 kecuali struk benar-benar menuliskan potongan:",
    "  kolom DISK/DISC/POT, tanda minus (-), atau dua harga berlabel coret.",
    "  Harga per satuan berat (kg, L, 100g) yang membuat total baris berbeda dari perkiraan",
    "  qty×unitPrice BUKAN diskon — itu harga × berat, jadi discount=0 dan lineTotal ikuti",
    "  angka yang tertulis di struk. Jika ragu, discount=0.",
    "Jika struk buram / tidak terbaca, kembalikan { items: [] }.",
    "Hanya balas dengan JSON, tanpa teks lain."
  );
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          qty: { type: "number" },
          unit: { type: "string" },
          unitPrice: { type: "number" },
          discount: { type: "number" },
          lineTotal: { type: "number" },
          categoryName: { type: "string" },
        },
        required: ["name", "qty", "unit", "unitPrice", "discount", "lineTotal"],
      },
    },
  },
  required: ["items"],
};

interface GeminiInlineImage {
  data: Buffer;
  mimeType: string;
}

/** Strip currency/whitespace noise and parse a number Gemini gave us. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Lowercase, trim punctuation/whitespace for forgiving name matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map the category name Gemini returned back to a real user category id.
 * Exact match first; falls back to a substring match in either direction so
 * "makanan" still resolves to "Makanan & Minuman". Returns null when there is
 * no confident match (user picks manually).
 */
export function resolveCategoryId(
  categoryName: string | null | undefined,
  categories: ReceiptCategory[]
): string | null {
  if (!categoryName) return null;
  const target = normalize(categoryName);
  if (!target) return null;

  const entries = categories.map((c) => ({
    id: c.id,
    label: normalize(categoryLabel(c)),
    name: normalize(c.name),
  }));

  // Exact match on the full label, then on the bare category name.
  for (const e of entries) if (e.label === target) return e.id;
  for (const e of entries) if (e.name === target) return e.id;

  // Substring match in either direction, preferring the bare (more specific)
  // name over the parent-qualified label.
  for (const e of entries) {
    if (target.includes(e.name) || e.name.includes(target)) return e.id;
  }
  for (const e of entries) {
    if (target.includes(e.label) || e.label.includes(target)) return e.id;
  }

  return null;
}

function toItem(
  raw: unknown,
  index: number,
  categories: ReceiptCategory[]
): ReceiptItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Item ${index + 1}`;
  const qty = Math.max(1, Math.round(toNumber(r.qty)));
  const unit =
    typeof r.unit === "string" && r.unit.trim() ? r.unit.trim() : null;
  const unitPrice = toNumber(r.unitPrice);
  const lineTotal = toNumber(r.lineTotal);
  const discount = Math.max(0, toNumber(r.discount));
  const categoryId = resolveCategoryId(
    typeof r.categoryName === "string" ? r.categoryName : null,
    categories
  );

  // Pure discount/voucher row (no product, negative amount): keep the row
  // marked negative so flattenDiscountRows can fold it into a neighbour.
  // Never converts to an expense transaction further down the flow.
  const isDiscountRow =
    lineTotal < 0 ||
    (unitPrice < 0 && /diskon|disc|pot|voucher|member|bonus/i.test(name));

  if (isDiscountRow) {
    return {
      id: `it-${index}`,
      name: name && name.toLowerCase() !== "diskon" ? `Diskon ${name}`.trim() : "Diskon",
      qty: 1,
      unit: null,
      unitPrice: 0,
      lineTotal: Math.min(lineTotal, unitPrice < 0 ? unitPrice : 0),
      discount: 0,
      originalPrice: 0,
      categoryId: null,
    };
  }

  // Normal line: lineTotal must reflect the discount as a deduction so the
  // prefilled form amount is already the discounted price. discount and
  // originalPrice are carried for display only — never persisted.
  const finalLineTotal =
    lineTotal > 0
      ? // Model-supplied total wins unless it ignored the discount.
        discount > 0 && lineTotal === qty * unitPrice
        ? lineTotal - discount
        : lineTotal
      : // Missing total: compute from price, applying any discount.
        qty * unitPrice - discount;

  return {
    id: `it-${index}`,
    name,
    qty,
    unit,
    unitPrice: Math.max(0, unitPrice),
    lineTotal: finalLineTotal,
    // originalPrice = lineTotal + discount keeps the invariant that the
    // recorded amount is always the discounted one.
    discount,
    originalPrice: finalLineTotal + discount,
    categoryId,
  };
}

/**
 * Fold pure discount rows (negative lineTotal) into the nearest previous
 * product line as a deduction, so no negative-amount transaction is ever
 * handed to the form. Discounting layouts vary by store, but a discount row
 * almost always sits right below the line it applies to (or at the tail for
 * a store-wide voucher, where it lands on the last line).
 */
function flattenDiscountRows(items: ReceiptItem[]): ReceiptItem[] {
  const kept: ReceiptItem[] = [];
  for (const item of items) {
    if (item.lineTotal < 0) {
      const amount = Math.abs(item.lineTotal);
      const prev = kept[kept.length - 1];
      if (prev) {
        prev.lineTotal -= amount;
        // The reduction counts as discount on that line; originalPrice is
        // untouched, so `originalPrice === lineTotal + discount` still holds.
        prev.discount += amount;
      }
      // Discount row before any product line: nothing to apply it to, drop.
      continue;
    }
    kept.push(item);
  }
  return kept;
}

/**
 * Run Gemini vision OCR on a receipt image. Throws on transport/API errors;
 * returns an empty array (not an exception) on an unreadable receipt.
 */
export async function extractReceiptItems(
  image: GeminiInlineImage,
  categories: ReceiptCategory[] = []
): Promise<ReceiptItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset");

  const url = `${GEMINI_BASE_URL}/${geminiModel()}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt(categories) },
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.data.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini mengembalikan JSON tidak valid");
  }

  const items = (parsed as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) return [];

  return flattenDiscountRows(items.map((raw, i) => toItem(raw, i, categories)));
}

/**
 * Resolve the line items for an uploaded receipt: real Gemini OCR when a key
 * is configured, otherwise the deterministic stub (dev without API key).
 */
export async function getReceiptItems(
  image: GeminiInlineImage,
  categories: ReceiptCategory[] = []
): Promise<{ items: ReceiptItem[]; source: "gemini" | "stub" }> {
  if (!hasGeminiKey()) {
    console.warn("[receipt] GEMINI_API_KEY belum diset — memakai item stub");
    return { items: getReceiptStub(), source: "stub" };
  }
  const items = await extractReceiptItems(image, categories);
  return { items, source: "gemini" };
}