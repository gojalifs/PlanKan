import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getWorkspaceMembers, removeMember } from "@/lib/workspace";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    const userHasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
    });

    if (!userHasAccess) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke workspace ini" }, { status: 403 });
    }

    const members = await getWorkspaceMembers(workspaceId);

    return NextResponse.json({ members, workspaceName: workspace.name });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("GET /api/workspaces/[id]/members error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    if (workspace.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Hanya owner yang bisa menghapus member" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    // Terima `userId` (baru) maupun `memberId` (lama) demi kompatibilitas.
    const memberUserId = searchParams.get("userId") ?? searchParams.get("memberId");

    if (!memberUserId) {
      return NextResponse.json({ error: "userId member wajib disediakan" }, { status: 400 });
    }

    if (memberUserId === workspace.ownerId) {
      return NextResponse.json({ error: "Owner tidak bisa dihapus dari workspace" }, { status: 400 });
    }

    await removeMember(workspaceId, memberUserId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("DELETE /api/workspaces/[id]/members error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
