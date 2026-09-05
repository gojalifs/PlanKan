import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { saveReceiptFile, cleanupStaleReceipts } from "@/lib/receipt-storage";
import { getReceiptStub } from "@/lib/receipt-stub";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// POST /api/receipts  (multipart/form-data, field "image")
// Saves the receipt image to a local temp dir (NOT MinIO) and returns the
// receipt contract with STUB line items. Real OCR later only replaces the
// item source; the response shape stays stable.
export async function POST(request: Request) {
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

    const items = getReceiptStub();

    return NextResponse.json(
      {
        id,
        imageUrl: `/api/receipts/${id}`,
        fileName: file.name,
        items,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/receipts error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah struk" }, { status: 500 });
  }
}