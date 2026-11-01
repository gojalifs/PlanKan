import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getAccessScope } from "@/lib/workspace";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const updateWalletSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["CASH", "BANK", "E_WALLET", "INVESTMENT", "SAVINGS", "OTHER"]).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isExcludedFromTotal: z.boolean().optional(),
  clientUpdatedAt: z.string().optional().nullable(),
});

async function GETHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { or } = await getAccessScope(session.user.id);
    const wallet = await prisma.wallet.findFirst({
      where: { id, OR: or },
      include: {
        transactions: {
          take: 10,
          orderBy: { date: "desc" },
          include: { category: true },
        },
      },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ wallet });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function PUTHandler(
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
    const validated = updateWalletSchema.parse(body);

    const { or } = await getAccessScope(session.user.id);
    const existing = await prisma.wallet.findFirst({
      where: { id, OR: or },
    });

    if (!existing) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    const clientUpdatedAtRaw =
      validated.clientUpdatedAt || request.headers.get("if-unmodified-since");
    if (clientUpdatedAtRaw) {
      const clientDate = new Date(clientUpdatedAtRaw);
      if (!Number.isNaN(clientDate.getTime()) && existing.updatedAt > clientDate) {
        return NextResponse.json(
          { error: "Konflik: data server lebih baru", wallet: existing },
          { status: 409 }
        );
      }
    }

    const { clientUpdatedAt: _clientUpdatedAt, ...walletData } = validated;
    const updated = await prisma.wallet.update({
      where: { id },
      data: walletData,
    });

    return NextResponse.json({ wallet: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function DELETEHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { or } = await getAccessScope(session.user.id);
    const existing = await prisma.wallet.findFirst({
      where: { id, OR: or },
    });

    if (!existing) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    await prisma.wallet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Dompet berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("wallets/[id]", GETHandler);
export const PUT = withMonitoring("wallets/[id]", PUTHandler);
export const DELETE = withMonitoring("wallets/[id]", DELETEHandler);
