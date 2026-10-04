import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { leaveWorkspace } from "@/lib/workspace";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
    });

    if (!membership) {
      return NextResponse.json({ error: "Kamu tidak berada di workspace ini" }, { status: 403 });
    }

    await leaveWorkspace(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("POST /api/workspaces/[id]/leave error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
