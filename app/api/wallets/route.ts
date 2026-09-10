import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const createWalletSchema = z.object({
  name: z.string().min(1, "Nama dompet wajib diisi"),
  type: z.enum(["CASH", "BANK", "E_WALLET", "INVESTMENT", "SAVINGS", "OTHER"]).default("BANK"),
  balance: z.number().default(0),
  currency: z.string().default("IDR"),
  color: z.string().default("#0ea5e9"),
  icon: z.string().default("Wallet"),
  isExcludedFromTotal: z.boolean().default(false),
});

async function GETHandler() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { transactions: true, transfersIn: true },
        },
      },
    });

    const totalBalance = wallets
      .filter((w) => !w.isExcludedFromTotal)
      .reduce((sum, w) => sum + Number(w.balance), 0);

    return NextResponse.json({ wallets, totalBalance });
  } catch (error: any) {
    console.error("Error GET /api/wallets:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createWalletSchema.parse(body);

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        name: validated.name,
        type: validated.type,
        balance: validated.balance,
        currency: validated.currency,
        color: validated.color,
        icon: validated.icon,
        isExcludedFromTotal: validated.isExcludedFromTotal,
      },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error: any) {
    console.error("Error POST /api/wallets:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("wallets", GETHandler);
export const POST = withMonitoring("wallets", POSTHandler);
