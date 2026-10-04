import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLimit } from "@/lib/entitlement";
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

async function GETHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await new Headers({ "Authorization": req.headers.get("authorization") || "" }),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { workspaceId: true },
    });

    const wallets = await prisma.wallet.findMany({
      where: {
        OR: [
          { userId: session.user.id, workspaceId: null },
          { workspaceId: { in: userWorkspaces.map(m => m.workspaceId) } }
        ]
      },
      orderBy: { createdAt: "asc" },
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

async function POSTHandler(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await new Headers({ "Authorization": req.headers.get("authorization") || "" }),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createWalletSchema.parse(body);
    const workspaceId = validated.workspaceId || null;

    // Enforce the plan's wallet count limit
    const walletLimit = await getLimit(session.user.id, "wallet.limit");
    if (walletLimit !== null) {
      const count = await prisma.wallet.count({
        where: {
          OR: [
            { userId: session.user.id, workspaceId: null },
            { workspaceId: { in: userWorkspaces.map(m => m.workspaceId) } }
          ]
        }
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