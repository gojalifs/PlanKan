import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getLimit } from "@/lib/entitlement";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const MAX_BATCH = 20;

const batchWalletSchema = z.object({
  wallets: z
    .array(
      z.object({
        name: z.string().min(1, "Nama dompet wajib diisi"),
        type: z
          .enum(["CASH", "BANK", "E_WALLET", "INVESTMENT", "SAVINGS", "OTHER"])
          .default("BANK"),
        balance: z.number().default(0),
        currency: z.string().default("IDR"),
        color: z.string().default("#0ea5e9"),
        icon: z.string().default("Wallet"),
        isExcludedFromTotal: z.boolean().default(false),
      })
    )
    .min(1, "Pilih minimal satu template")
    .max(MAX_BATCH, `Maksimal ${MAX_BATCH} dompet sekaligus`),
});

async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Body harus berupa JSON valid" }, { status: 400 });
    }

    const validated = batchWalletSchema.parse(raw);

    const incoming = validated.wallets;

    // The plan's wallet count limit applies to the whole batch: reject up front
    // rather than creating a partial batch and failing halfway.
    const walletLimit = await getLimit(session.user.id, "wallet.limit");
    if (walletLimit !== null) {
      const count = await prisma.wallet.count({ where: { userId: session.user.id } });
      if (count + incoming.length > walletLimit) {
        const remaining = Math.max(0, walletLimit - count);
        return NextResponse.json(
          {
            error:
              remaining === 0
                ? `Kamu maksimal punya ${walletLimit} dompet di paket ini. Naikkan langganan untuk lebih banyak.`
                : `Kamu cuma bisa tambah ${remaining} dompet lagi di paket ini (maksimal ${walletLimit}).`,
            code: "WALLET_LIMIT_REACHED",
            limit: walletLimit,
            remaining,
          },
          { status: 409 }
        );
      }
    }

    const wallets = await prisma.wallet.createManyAndReturn({
      data: incoming.map((w) => ({
        userId: session.user.id,
        name: w.name,
        type: w.type,
        balance: w.balance,
        currency: w.currency,
        color: w.color,
        icon: w.icon,
        isExcludedFromTotal: w.isExcludedFromTotal,
      })),
    });

    return NextResponse.json({ wallets }, { status: 201 });
  } catch (error: unknown) {
    const e = error as {
      name?: string;
      message?: string;
      issues?: { message?: string }[];
      errors?: { message?: string }[];
    };
    console.error("Error POST /api/wallets/batch:", error);
    if (e.name === "ZodError") {
      return NextResponse.json(
        { error: e.issues?.[0]?.message || e.errors?.[0]?.message || "Data tidak valid" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export const POST = withMonitoring("wallets", POSTHandler);
