import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { readReceiptFile, deleteReceiptFile } from "@/lib/receipt-storage";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/receipts/[id]
// Serves the uploaded temp receipt image. Auth-gated; ids are unguessable
// UUIDs and receipts are never listed or shared. no-store because the file
// is deleted when the flow ends and a cached image would linger.
async function GETHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const file = await readReceiptFile(id);
    if (!file) {
      return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.data.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("GET /api/receipts/[id] error:", error);
    return NextResponse.json({ error: error.message || "Gagal memuat gambar" }, { status: 500 });
  }
}

// DELETE /api/receipts/[id]
// Removes the temp receipt file when the extraction flow finishes. Idempotent.
async function DELETEHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteReceiptFile(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/receipts/[id] error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus gambar" }, { status: 500 });
  }
}

export const GET = withMonitoring("receipts/[id]", GETHandler);
export const DELETE = withMonitoring("receipts/[id]", DELETEHandler);