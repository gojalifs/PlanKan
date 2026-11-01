import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { getLimit } from "@/lib/entitlement";
import { getAccessibleWorkspaceIds } from "@/lib/workspace";
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
  workspaceId: z.string().nullable().optional(),
  idempotencyKey: z.string().optional().nullable(),
});

async function GETHandler() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const workspaceIds = await getAccessibleWorkspaceIds(session.user.id);

    const wallets = await prisma.wallet.findMany({
      where: {
        OR: [
          { userId: session.user.id, workspaceId: null },
          ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
        ],
      },
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
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("Error GET /api/wallets:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
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

    const idempotencyKey =
      validated.idempotencyKey || request.headers.get("idempotency-key");

    if (idempotencyKey) {
      const existing = await prisma.wallet.findFirst({
        where: { userId: session.user.id, idempotencyKey },
      });
      if (existing) {
        return NextResponse.json({ wallet: existing, alreadySaved: true }, { status: 200 });
      }
    }

    const workspaceIds = await getAccessibleWorkspaceIds(session.user.id);

    // Kalau workspaceId dikirim, user wajib member workspace tsb. Kalau tidak,
    // wallet jadi personal (workspaceId = null).
    let workspaceId: string | null = null;
    if (validated.workspaceId) {
      if (!workspaceIds.includes(validated.workspaceId)) {
        return NextResponse.json(
          { error: "Kamu bukan member workspace tersebut" },
          { status: 403 }
        );
      }
      workspaceId = validated.workspaceId;
    } else if (validated.workspaceId === undefined && workspaceIds.length > 0) {
      // Family workspace: wallet baru otomatis shared ke workspace.
      workspaceId = workspaceIds[0];
    }

    // Enforce the plan's wallet count limit (wallet.limit; null == unlimited).
    const walletLimit = await getLimit(session.user.id, "wallet.limit");
    if (walletLimit !== null) {
      const count = await prisma.wallet.count({
        where: {
          OR: [
            { userId: session.user.id, workspaceId: null },
            ...(workspaceIds.length > 0 ? [{ workspaceId: { in: workspaceIds } }] : []),
          ],
        },
      });
      if (count >= walletLimit) {
        return NextResponse.json(
          {
            error: `Kamu maksimal punya ${walletLimit} dompet di paket ini. Naikkan langganan untuk lebih banyak.`,
            code: "WALLET_LIMIT_REACHED",
            limit: walletLimit,
          },
          { status: 409 }
        );
      }
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        workspaceId,
        name: validated.name,
        type: validated.type,
        balance: validated.balance,
        currency: validated.currency,
        color: validated.color,
        icon: validated.icon,
        isExcludedFromTotal: validated.isExcludedFromTotal,
        idempotencyKey: idempotencyKey || null,
      },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string; errors?: { message?: string }[] };
    console.error("Error POST /api/wallets:", error);
    if (e.name === "ZodError") {
      return NextResponse.json({ error: e.errors?.[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export const GET = withMonitoring("wallets", GETHandler);
export const POST = withMonitoring("wallets", POSTHandler);
