import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
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
    const wallet = await prisma.wallet.findFirst({
      where: { id, userId: session.user.id },
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

    const existing = await prisma.wallet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Dompet tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.wallet.update({
      where: { id },
      data: validated,
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
    const existing = await prisma.wallet.findFirst({
      where: { id, userId: session.user.id },
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
