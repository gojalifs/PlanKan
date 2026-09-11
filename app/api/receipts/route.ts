import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { ensureUserStarterData } from "@/lib/default-categories";
import { saveReceiptFile, cleanupStaleReceipts, readReceiptFile } from "@/lib/receipt-storage";
import { getReceiptItems, type ReceiptCategory } from "@/lib/receipt-ocr";
import type { ReceiptItem } from "@/lib/receipt";
import { withMonitoring } from "@/lib/monitoring";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// POST /api/receipts  (multipart/form-data, field "image")
// Saves the receipt image to a local temp dir (NOT MinIO) and returns the
// receipt contract with line items extracted by Gemini vision OCR. Without a
// GEMINI_API_KEY it falls back to the deterministic stub (dev).
async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File gambar wajib diunggah" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 10MB" }, { status: 400 });
    }

    const { id } = await saveReceiptFile(file);

    // Opportunistic sweep of abandoned temp receipts (best-effort)
    cleanupStaleReceipts().catch(() => {});

    // Real Gemini vision OCR when a key is configured; stub fallback in dev.
    let items: ReceiptItem[] = [];
    let transactionDate = "";
    let transactionDateConfidence: number | null = null;
    const stored = await readReceiptFile(id);
    if (stored) {
      try {
        // Make sure default categories exist, then hand the user's expense
        // categories to the model so it can suggest a category per item.
        await ensureUserStarterData(session.user.id);
        const cats = await prisma.category.findMany({
          where: { userId: session.user.id, type: "EXPENSE" },
          select: { id: true, name: true, parent: { select: { name: true } } },
        });
        const categories: ReceiptCategory[] = cats.map((c) => ({
          id: c.id,
          name: c.name,
          parentName: c.parent?.name ?? null,
        }));

        ({ items, transactionDate, transactionDateConfidence } = await getReceiptItems(
          { data: stored.data, mimeType: stored.mimeType },
          categories
        ));
      } catch (error: any) {
        console.error("Gemini OCR error:", error);
        return NextResponse.json(
          { error: "Gagal membaca struk: " + (error?.message || "kesalahan tak dikenal") },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        id,
        imageUrl: `/api/receipts/${id}`,
        fileName: file.name,
        transactionDate,
        transactionDateConfidence,
        items,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/receipts error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah struk" }, { status: 500 });
  }
}

export const POST = withMonitoring("receipts", POSTHandler);