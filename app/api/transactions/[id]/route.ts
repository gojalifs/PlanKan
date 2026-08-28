import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { z } from "zod";

const updateTransactionSchema = z.object({
  walletId: z.string().min(1).optional(),
  destinationWalletId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
  amount: z.number().positive().optional(),
  date: z.string().optional(),
  note: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        wallet: true,
        destinationWallet: true,
        category: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateTransactionSchema.parse(body);

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const newType = validated.type || existing.type;
    const newAmount = validated.amount !== undefined ? validated.amount : Number(existing.amount);
    const newWalletId = validated.walletId || existing.walletId;
    const newDestWalletId = validated.destinationWalletId !== undefined ? validated.destinationWalletId : existing.destinationWalletId;
    const newDate = validated.date ? new Date(validated.date) : existing.date;
    const newNote = validated.note !== undefined ? validated.note : existing.note;
    const newCategoryId = validated.categoryId !== undefined ? validated.categoryId : existing.categoryId;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Revert previous transaction effects
      const prevAmount = Number(existing.amount);
      if (existing.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: prevAmount } },
        });
      } else if (existing.type === "INCOME") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { decrement: prevAmount } },
        });
      } else if (existing.type === "TRANSFER" && existing.destinationWalletId) {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: prevAmount } },
        });
        await tx.wallet.update({
          where: { id: existing.destinationWalletId },
          data: { balance: { decrement: prevAmount } },
        });
      }

      // 2. Apply new transaction effects
      if (newType === "EXPENSE") {
        await tx.wallet.update({
          where: { id: newWalletId },
          data: { balance: { decrement: newAmount } },
        });
      } else if (newType === "INCOME") {
        await tx.wallet.update({
          where: { id: newWalletId },
          data: { balance: { increment: newAmount } },
        });
      } else if (newType === "TRANSFER" && newDestWalletId) {
        await tx.wallet.update({
          where: { id: newWalletId },
          data: { balance: { decrement: newAmount } },
        });
        await tx.wallet.update({
          where: { id: newDestWalletId },
          data: { balance: { increment: newAmount } },
        });
      }

      // 3. Update transaction record
      return await tx.transaction.update({
        where: { id },
        data: {
          walletId: newWalletId,
          destinationWalletId: newType === "TRANSFER" ? newDestWalletId : null,
          categoryId: newType !== "TRANSFER" ? newCategoryId : null,
          type: newType,
          amount: newAmount,
          date: newDate,
          note: newNote,
        },
        include: {
          wallet: true,
          destinationWallet: true,
          category: true,
        },
      });
    });

    return NextResponse.json({ transaction: updated });
  } catch (error: any) {
    console.error("Error PUT /api/transactions/[id]:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const amount = Number(existing.amount);
      if (existing.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: amount } },
        });
      } else if (existing.type === "INCOME") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { decrement: amount } },
        });
      } else if (existing.type === "TRANSFER" && existing.destinationWalletId) {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: amount } },
        });
        await tx.wallet.update({
          where: { id: existing.destinationWalletId },
          data: { balance: { decrement: amount } },
        });
      }

      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus" });
  } catch (error: any) {
    console.error("Error DELETE /api/transactions/[id]:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
