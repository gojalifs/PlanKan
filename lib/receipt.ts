/**
 * Shared types for the receipt → multi-transaction flow.
 *
 * This is the single contract between the upload API, the client hook and
 * the multi-transaction dialog. It is deliberately OCR-agnostic: swapping
 * the STUB items for real OCR output later only touches the parse step and
 * never these shapes.
 */

export interface ReceiptItem {
  /** Stable per-receipt item id, e.g. "it-0". */
  id: string;
  /** Line-item name, e.g. "Gula". */
  name: string;
  /** Quantity, e.g. 2. */
  qty: number;
  /** Pack/capture-size unit string, e.g. "1kg" or "pcs". */
  unit: string | null;
  /** Price for one unit. */
  unitPrice: number;
  /** qty * unitPrice (minus any discount) — the amount actually recorded
   * for the transaction. Discounts are folded into this value on the OCR
   * side; this is always the price after discount and the one saved. */
  lineTotal: number;
  /** Potongan harga (Rp) applied to this line, 0 when none. Display-only:
   * the amount recorded is always `lineTotal` (after discount). */
  discount: number;
  /** Line amount before any discount (= lineTotal + discount). Display-only,
   * so the modal can show "harga asli → harga bayar". */
  originalPrice: number;
  /** Best-guess user category id (from Gemini against the user's category
   * list), pre-filled in the form but always overridable by the user. */
  categoryId: string | null;
}

export interface ReceiptUpload {
  /** Receipt id; also the temp-file base name. */
  id: string;
  /** URL to the persisted temp image, e.g. "/api/receipts/<id>". */
  imageUrl: string;
  /** Original file name, for display. */
  fileName: string;
  /** Line items extracted by OCR. */
  items: ReceiptItem[];
}

/**
 * Fold quantity/unit into a readable note. One receipt line = one
 * transaction: qty and pack unit live in the note, the recorded amount is
 * the line total.
 *
 * "Gula", qty 2, unit "1kg" → "Gula ×2 (1kg)"
 * "Bakso", qty 1, unit null → "Bakso"
 */
export function formatReceiptNote(item: ReceiptItem): string {
  const detail: string[] = [];
  if (item.qty > 1) detail.push(`×${item.qty}`);
  if (item.unit) {
    detail.push(item.unit.startsWith("(") ? item.unit : `(${item.unit})`);
  }
  return detail.length ? `${item.name} ${detail.join(" ")}` : item.name;
}