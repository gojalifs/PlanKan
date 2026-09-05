import { ReceiptItem } from "@/lib/receipt";

/**
 * STUB receipt data — placeholder for real OCR output.
 *
 * The structure is identical to what OCR will produce later, so wiring in a
 * real parser only changes this function (or its server-side call site) and
 * never touches the client. Kept deterministic so the whole flow is
 * testable end-to-end before OCR exists.
 */
export function getReceiptStub(): ReceiptItem[] {
  return [
    { id: "it-0", name: "Bakso Ber + Telor", qty: 1, unit: null, unitPrice: 15000, lineTotal: 15000 },
    { id: "it-1", name: "Es Teh Manis", qty: 1, unit: null, unitPrice: 5000, lineTotal: 5000 },
    { id: "it-2", name: "Gula", qty: 2, unit: "1kg", unitPrice: 13000, lineTotal: 26000 },
    { id: "it-3", name: "Mie Instan Goreng", qty: 3, unit: "pcs", unitPrice: 3000, lineTotal: 9000 },
  ];
}