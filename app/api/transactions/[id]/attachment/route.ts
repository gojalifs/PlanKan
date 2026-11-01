import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getAccessScope } from "@/lib/workspace";
import { withMonitoring } from "@/lib/monitoring";

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
    const { or } = await getAccessScope(session.user.id);
    const transaction = await prisma.transaction.findFirst({
      where: { id, OR: or },
      select: { id: true, attachmentUrl: true },
    });

    if (!transaction || !transaction.attachmentUrl) {
      return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ url: transaction.attachmentUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMonitoring("transactions/[id]/attachment", GETHandler);
