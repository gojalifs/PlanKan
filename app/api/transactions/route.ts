import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const createTransactionSchema = z.object({
  walletId: z.string().min(1, "Dompet asal wajib dipilih"),
  destinationWalletId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.number().positive("Nominal harus lebih besar dari 0"),
  date: z.string().optional(),
  note: z.string().optional().nullable(),
  // Idempotency key: retries of the same logical save reuse this value, so a
  // save whose response was lost (proxy timeout after commit) returns the
  // already-created row instead of duplicating the transaction + balance.
  idempotencyKey: z.string().optional().nullable(),
});

async function GETHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get("walletId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const whereClause: any = {
      userId: session.user.id,
    };

    if (walletId) {
      whereClause.OR = [
        { walletId },
        { destinationWalletId: walletId },
      ];
    }

    if (categoryId && categoryId !== "ALL") {
      const subCats = await prisma.category.findMany({
        where: { parentId: categoryId, userId: session.user.id },
        select: { id: true },
      });
      if (subCats.length > 0) {
        whereClause.categoryId = {
          in: [categoryId, ...subCats.map((s) => s.id)],
        };
      } else {
        whereClause.categoryId = categoryId;
      }
    }

    if (type && ["INCOME", "EXPENSE", "TRANSFER"].includes(type)) {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date.lte = end;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: limit,
      include: {
        wallet: true,
        destinationWallet: true,
        category: {
          include: {
            parent: true,
          },
        },
      },
    });

    // Summary calculation
    const allMatching = await prisma.transaction.findMany({
      where: whereClause,
      select: { type: true, amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of allMatching) {
      const amt = Number(t.amount);
      if (t.type === "INCOME") totalIncome += amt;
      if (t.type === "EXPENSE") totalExpense += amt;
    }

    return NextResponse.json({
      transactions,
      summary: {
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
      },
    });
  } catch (error: any) {
    console.error("Error GET /api/transactions:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Detect multipart/form-data for file uploads
    const contentType = request.headers.get('content-type') || '';
    let data: any = {};
    let attachmentFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data.walletId = formData.get('walletId')?.toString() || '';
      data.destinationWalletId = formData.get('destinationWalletId')?.toString() || null;
      data.categoryId = formData.get('categoryId')?.toString() || null;
      data.type = formData.get('type')?.toString();
      data.amount = parseFloat(formData.get('amount')?.toString() || '0');
      data.date = formData.get('date')?.toString() || undefined;
      data.note = formData.get('note')?.toString() || null;
      data.idempotencyKey = formData.get('idempotencyKey')?.toString() || null;
      const file = formData.get('attachment');
      if (file && file instanceof File) {
        attachmentFile = file;
      }
    } else {
      const body = await request.json();
      data = body;
    }

    const validated = createTransactionSchema.parse(data);

    // Idempotency guard: a retry of a save whose response was lost hits the
    // same key — return the already-created row instead of writing again.
    if (validated.idempotencyKey) {
      const existing = await prisma.transaction.findFirst({
        where: { userId: session.user.id, idempotencyKey: validated.idempotencyKey },
        include: { wallet: true, destinationWallet: true, category: true },
      });
      if (existing) {
        return NextResponse.json({ transaction: existing, alreadySaved: true }, { status: 200 });
      }
    }

    const sourceWallet = await prisma.wallet.findFirst({
      where: { id: validated.walletId, userId: session.user.id },
    });
    if (!sourceWallet) {
      return NextResponse.json({ error: "Dompet asal tidak valid" }, { status: 400 });
    }

    if (validated.type === "TRANSFER") {
      if (!validated.destinationWalletId) {
        return NextResponse.json({ error: "Dompet tujuan wajib dipilih untuk transfer" }, { status: 400 });
      }
      if (validated.destinationWalletId === validated.walletId) {
        return NextResponse.json({ error: "Dompet asal dan tujuan tidak boleh sama" }, { status: 400 });
      }
      const destWallet = await prisma.wallet.findFirst({
        where: { id: validated.destinationWalletId, userId: session.user.id },
      });
      if (!destWallet) {
        return NextResponse.json({ error: "Dompet tujuan tidak valid" }, { status: 400 });
      }
    }

    // Upload attachment if present
    let attachmentUrl: string | undefined = undefined;
    if (attachmentFile) {
      const arrayBuffer = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { uploadFile } = await import('@/lib/minio');
      attachmentUrl = await uploadFile(buffer, attachmentFile.name, attachmentFile.type);
    }

    const transactionDate = validated.date ? new Date(validated.date) : new Date();

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            userId: session.user.id,
            walletId: validated.walletId,
            destinationWalletId: validated.type === "TRANSFER" ? validated.destinationWalletId : null,
            categoryId: validated.type !== "TRANSFER" ? validated.categoryId : null,
            type: validated.type,
            amount: validated.amount,
            date: transactionDate,
            note: validated.note || null,
            attachmentUrl: attachmentUrl || null,
            idempotencyKey: validated.idempotencyKey || null,
          },
          include: {
            wallet: true,
            destinationWallet: true,
            category: true,
          },
        });

        if (validated.type === "EXPENSE") {
          await tx.wallet.update({
            where: { id: validated.walletId },
            data: { balance: { decrement: validated.amount } },
          });
        } else if (validated.type === "INCOME") {
          await tx.wallet.update({
            where: { id: validated.walletId },
            data: { balance: { increment: validated.amount } },
          });
        } else if (validated.type === "TRANSFER" && validated.destinationWalletId) {
          await tx.wallet.update({
            where: { id: validated.walletId },
            data: { balance: { decrement: validated.amount } },
          });
          await tx.wallet.update({
            where: { id: validated.destinationWalletId },
            data: { balance: { increment: validated.amount } },
          });
        }

        return transaction;
      });
    } catch (txError: any) {
      // P2002 on idempotencyKey: a concurrent request with the same key won
      // the create (its $transaction committed). Its $transaction, including
      // the balance update, was rolled back — return the winning row so the
      // caller treats this save as done and never duplicates.
      if (txError?.code === "P2002" && validated.idempotencyKey) {
        const existing = await prisma.transaction.findFirst({
          where: { userId: session.user.id, idempotencyKey: validated.idempotencyKey },
          include: { wallet: true, destinationWallet: true, category: true },
        });
        if (existing) {
          return NextResponse.json({ transaction: existing, alreadySaved: true }, { status: 200 });
        }
      }
      throw txError;
    }

    return NextResponse.json({ transaction: created }, { status: 201 });
  } catch (error: any) {
    console.error("Error POST /api/transactions:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("transactions", GETHandler);
export const POST = withMonitoring("transactions", POSTHandler);
