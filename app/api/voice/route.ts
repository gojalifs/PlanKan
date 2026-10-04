import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { ensureUserStarterData } from "@/lib/default-categories";
import { hasGeminiKey, type ReceiptCategory } from "@/lib/receipt-ocr";
import { authorizeOcr, finishOcr, ocrQuotaErrorBody } from "@/lib/ocr-gate";
import { getUsage } from "@/lib/usage";
import { canUse } from "@/lib/entitlement";
import { parseVoiceTranscript } from "@/lib/voice-parse";
import { withMonitoring } from "@/lib/monitoring";

const bodySchema = z.object({
  text: z.string().trim().min(1, "Kalimat tidak boleh kosong").max(1000, "Kalimat terlalu panjang"),
});

// POST /api/voice  { text: "Kemarin beli bensin 50 ribu pakai BCA" }
// Parses a spoken/typed phrase into a draft transaction via Gemini function
// calling, then resolves wallet/category names → ids. Returns `{ draft }`.
async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasGeminiKey()) {
      return NextResponse.json(
        { error: "Fitur suara belum aktif: GEMINI_API_KEY belum diset" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }
    const { text } = result.data;

    // Voice shares the same monthly OCR pool (monetise.md §11). Claim a
    // credit before the paid Gemini call, release it if the call fails.
    const ocrAuth = await authorizeOcr(session.user.id);
    if (!ocrAuth.ok) {
      return NextResponse.json(ocrQuotaErrorBody(ocrAuth), { status: 429 });
    }

    try {
      // Ensure default wallet/category seeds exist, then fetch them.
      // Auto-categorization (ai.auto_category) is a Plus+ feature: non-
      // entitled plans don't get a category list, so the draft's categoryId
      // stays null and the confirm form asks the user (monetise.md §4).
      await ensureUserStarterData(session.user.id);
      const suggestCategories = await canUse(session.user.id, "ai.auto_category");
      const [wallets, cats] = await Promise.all([
        prisma.wallet.findMany({
          where: { userId: session.user.id },
          select: { id: true, name: true },
          orderBy: { createdAt: "asc" },
        }),
        suggestCategories
          ? prisma.category.findMany({
              where: { userId: session.user.id, type: { in: ["INCOME", "EXPENSE"] } },
              select: { id: true, name: true, type: true, parent: { select: { name: true } } },
            })
          : Promise.resolve([]),
      ]);

      const categories: ReceiptCategory[] = cats.map((c) => ({
        id: c.id,
        name: c.name,
        parentName: c.parent?.name ?? null,
      }));

      const draft = await parseVoiceTranscript(text, { wallets, categories });
      const usage = await getUsage(session.user.id, "ocr");
      return NextResponse.json({ draft, usage });
    } catch (error) {
      await finishOcr(session.user.id, { success: false, refId: ocrAuth.refId });
      const message = error instanceof Error ? error.message : "kesalahan tak dikenal";
      console.error("POST /api/voice error:", error);
      return NextResponse.json(
        { error: "Gagal memahami ucapan: " + message },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "kesalahan tak dikenal";
    console.error("POST /api/voice error:", error);
    return NextResponse.json(
      { error: "Gagal memahami ucapan: " + message },
      { status: 502 }
    );
  }
}

export const POST = withMonitoring("voice", POSTHandler);