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
"Foto struk belanja. Ekstrak tanggal transaksi dan SEMUA baris item ke JSON.",
    "",
    "transactionDate: tanggal transaksi pada struk, format YYYY-MM-DD.",
    "  Cari tanggal di bagian atas struk (sebelum daftar item), mis. \"31-08-26\",",
    "  \"31/08/2026\", \"SELASA 31 AGU 2026\", dll. Konversi ke YYYY-MM-DD.",
    "  Jika tanggal tidak ditemukan, gunakan string kosong \"\".",
    "",
    "Untuk setiap item:",
    "- name: nama barang",
    "- qty: jumlah yang TERTULIS di kolom qty. Jangan diubah, jangan dibulatkan",
    "  menjadi 1 (mis. berat 810 tetap 810). Baris tanpa qty → 1.",
    '- unit: satuan qty ("pcs", "1kg", "lusin", "g", "kg", "100g", "l", "ml")',
    "  atau string kosong bila tidak tercetak.",
    "- unitPrice: harga per satuan yang TERCETAK dalam Rupiah (selalu positif).",
    "- discount: potongan Rupiah pada baris item ini (0 jika tidak ada).",
    "- lineTotal: HARGA AKHIR yang benar-benar dibayar untuk baris ini, dalam",
    "  Rupiah. Sudah DIKURANGI semua discount (HEMAT/DISK/POT). Dasarnya angka",
    "  kolom TOTAL / angka terakhir baris yang TERCETAK, lalu kurangi discount.",
    "- categoryName: kategori yang paling cocok untuk item ini (lihat daftar di bawah)",
    "",
    "PENTING — BARANG DITIMBANG (sayur/buah/daging/ikan):",
    "- Struk menulis BERAT barang dan HARGA PER SATUAN BERAT. Contoh (Super Indo):",
    "  \"JERUK CLEMENVILLE | 810 | 84.900 | 68.770\"  + HEMAT -4.050 di bawah",
    "  → qty=810, unit=\"g\", unitPrice=84900 (harga per 1 kg), lineTotal=64720",
    "    (= kolom TOTAL yang TERCETAK 68.770, dikurangi HEMAT 4.050).",
    "- qty = berat yang tercetak apa adanya; unit = satuan berat yang tercetak",
    "  (g / kg / 100g). JANGAN mengonversi atau membulatkan beratnya.",
    "- Kolom TOTAL (68.770) adalah harga SEBELUM diskon = berat × harga per kg.",
    "  Jangan menghitung ulang qty×unitPrice (skala unitnya beda); baca TOTAL,",
    "  lalu kurangi HEMAT untuk lineTotal.",
    "- Kontras: kemasan TETAP (\"Gula 1kg\", \"Beras 5kg\") adalah SATU unit beli:",
    "  qty = jumlah kemasan (2), unit = \"1kg\", unitPrice = harga per kemasan.",
    "",
    "PENTING — HARGA TERCETAK ADALAH HARGA SEBELUM DISKON:",
    "- Di struk Indonesia, harga satuan (84.900), kolom TOTAL (68.770) dan Sub",
    "  Total semuanya adalah harga NORMAL SEBELUM diskon. HEMAT/DISK/POT yang",
    "  tercetak MENGURANGI jumlah yang benar-benar dibayar.",
    "- lineTotal = harga yang benar-benar dibayar = angka kolom TOTAL DIKURANGI",
    "  discount. Ada HEMAT di bawah sebuah item → lineTotal SELALU lebih kecil",
    "  dari kolom TOTAL. Contoh: TOTAL 68.770 + HEMAT -4.050 → lineTotal 64.720.",
    "- HEMAT/DISK/POT sub-line: gabungkan ke field discount item di atasnya",
    "  (bukan baris item terpisah). discount = nilai Rupiah positif potongan.",
    "- Dua harga pada baris yang sama (harga coret vs harga bayar): discount =",
    "  selisih keduanya; lineTotal = harga bayar yang tercetak (sudah FINAL — itu",
    "  angka yang dibayar — jangan dikurangi lagi).",
    "- Tanpa diskon yang tercetak: discount = 0, lineTotal = kolom TOTAL.",
    "- Baris potongan murni (tanpa nama barang, bernilai negatif, mis. voucher/",
    "  potongan akhir struk): name=\"Diskon\", lineTotal NEGATIF, mis. -2500.",
    "- label HEMAT/DISK yang bukan potongan (\"RINGAN\", \"BARU\") → discount=0.",
    "- JANGAN MENEBAK DISKON: discount=0 kecuali struk benar-benar mencetak",
    "  HEMAT/DISK/POT, tanda minus (-), atau dua harga berlabel coret.",
    "",
    "PENTING — ANGKA:",
    "- Tulis Rupiah tanpa pemisah ribuan: 84.900 → 84900, 68.770 → 68770, 1.890 → 1890.",
    "- Tanda minus hanya untuk baris potongan murni.",
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
    "Jika struk buram / tidak terbaca, kembalikan { items: [] }.",
    "Hanya balas dengan JSON, tanpa teks lain."
  );
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transactionDate: { type: "string" },
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

/**
 * Strip currency/whitespace noise and parse a number Gemini gave us.
 * Struk Indonesia memakai TITIK pemisah ribuan (84.900 → 84900) dan KOMA
 * desimal (0,81 → 0.81), jadi tidak bisa asal menghapus semua tanda.
 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  let s = value.replace(/[^\d.,-]/g, "");
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let norm: string;
  if (lastDot !== -1 && lastComma !== -1) {
    // "84.900,50" / "1,234.56" → pemisah TERAKHIR adalah desimal.
    norm = lastDot > lastComma ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if (lastComma !== -1) {
    // "0,81" → koma desimal.
    norm = s.replace(/,/g, ".");
  } else if (lastDot !== -1) {
    // "0.81" → titik desimal; "84.900"/"1.890" → titik ribuan (3 digit di belakang).
    const fracDigits = s.length - lastDot - 1;
    norm = fracDigits >= 1 && fracDigits <= 2 ? s : s.replace(/\./g, "");
  } else {
    norm = s;
  }
  const n = Number(norm);
  return Number.isFinite(n) ? (neg ? -n : n) : 0;
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

/**
 * Align a weighable quantity with the scale of `unitPrice` for the no-TOTAL
 * fallback. Receipts print grams (810) alongside a per-kg price (84.900), so
 * grams must become kg before multiplying. Non-weight units (kg, 100g, pcs,
 * volume) already match their printed price scale and pass through unchanged.
 */
function weightQty(qty: number, unit: string | null): number {
  if (/^(g|gr|gram)$/i.test(unit ?? "")) return qty / 1000;
  return qty;
}

function toItem(
  raw: unknown,
  index: number,
  categories: ReceiptCategory[]
): ReceiptItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Item ${index + 1}`;
  const rawQty = toNumber(r.qty);
  // Jangan bulatkan qty: barang timbangan bisa berupa desimal (0.81 kg) atau
  // gram utuh (810 g). Hanya jaga agar tidak ≤ 0.
  const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
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

  // Normal line: the model outputs the final amount actually paid — the printed
  // TOTAL column is pre-discount, so lineTotal already excludes HEMAT/DISK. We
  // trust that value as the recorded amount; discount stays display-only and
  // originalPrice = lineTotal + discount reconstructs the pre-discount price.
  const finalLineTotal =
    lineTotal > 0
      ? lineTotal
      : // TOTAL column unreadable: reconstruct from qty × unitPrice. For weighable
        // items the printed unitPrice is per weight unit, so align grams to kg
        // first, then apply the discount.
        weightQty(qty, unit) * unitPrice - discount;

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
 * returns an empty item array (not an exception) on an unreadable receipt.
 * `transactionDate` is "YYYY-MM-DD", or "" when the receipt shows no date.
 */
export async function extractReceiptItems(
  image: GeminiInlineImage,
  categories: ReceiptCategory[] = []
): Promise<{ items: ReceiptItem[]; transactionDate: string }> {
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

  const parsedObj = parsed as { items?: unknown[]; transactionDate?: string };
  const items = parsedObj?.items;
  if (!Array.isArray(items)) {
    // No readable item list — still try to salvage the date.
    return { items: [], transactionDate: parsedObj?.transactionDate ?? "" };
  }

  return {
    items: flattenDiscountRows(items.map((raw, i) => toItem(raw, i, categories))),
    transactionDate: parsedObj?.transactionDate ?? "",
  };
}

/**
 * Resolve the line items for an uploaded receipt: real Gemini OCR when a key
 * is configured, otherwise the deterministic stub (dev without API key).
 * `transactionDate` is "YYYY-MM-DD"; the stub has no date so it returns "".
 */
export async function getReceiptItems(
  image: GeminiInlineImage,
  categories: ReceiptCategory[] = []
): Promise<{ items: ReceiptItem[]; source: "gemini" | "stub"; transactionDate: string }> {
  if (!hasGeminiKey()) {
    console.warn("[receipt] GEMINI_API_KEY belum diset — memakai item stub");
    return { items: getReceiptStub(), source: "stub", transactionDate: "" };
  }
  const { items, transactionDate } = await extractReceiptItems(image, categories);
  return { items, source: "gemini", transactionDate };
}