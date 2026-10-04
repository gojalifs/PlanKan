import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getWorkspace, updateWorkspace, deleteWorkspace } from "@/lib/workspace";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const workspace = await getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    const userHasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
    });

    if (!userHasAccess) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke workspace ini" }, { status: 403 });
    }

    return NextResponse.json({ workspace });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("GET /api/workspaces/[id] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const workspace = await getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    if (workspace.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Hanya owner yang bisa mengupdate workspace" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama workspace wajib diisi" }, { status: 400 });
    }

    const updated = await updateWorkspace(workspaceId, { name: name.trim() });

    return NextResponse.json({ workspace: updated });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("PATCH /api/workspaces/[id] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const workspace = await getWorkspace(workspaceId);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace tidak ditemukan" }, { status: 404 });
    }

    if (workspace.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Hanya owner yang bisa menghapus workspace" }, { status: 403 });
    }

    await deleteWorkspace(workspaceId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("DELETE /api/workspaces/[id] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
