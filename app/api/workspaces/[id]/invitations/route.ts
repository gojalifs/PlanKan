import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import {
  inviteMember,
  cancelInvitation,
  getPendingInvitations,
} from "@/lib/workspace";

type Params = { params: Promise<{ id: string }> };

async function requireOwner(workspaceId: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) return { error: "Workspace tidak ditemukan", status: 404 } as const;

  if (workspace.ownerId !== userId) {
    return { error: "Hanya owner yang bisa mengelola invitation", status: 403 } as const;
  }

  return { workspace };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const checked = await requireOwner(workspaceId, session.user.id);
    if ("error" in checked) {
      return NextResponse.json({ error: checked.error }, { status: checked.status });
    }

    const invitations = await getPendingInvitations(workspaceId);

    return NextResponse.json({ invitations });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("GET /api/workspaces/[id]/invitations error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const checked = await requireOwner(workspaceId, session.user.id);
    if ("error" in checked) {
      return NextResponse.json({ error: checked.error }, { status: checked.status });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const invitation = await inviteMember(workspaceId, email.trim().toLowerCase());

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("POST /api/workspaces/[id]/invitations error:", error);
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

    const checked = await requireOwner(workspaceId, session.user.id);
    if ("error" in checked) {
      return NextResponse.json({ error: checked.error }, { status: checked.status });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disediakan" }, { status: 400 });
    }

    // Pastikan invitation memang milik workspace ini.
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation tidak ditemukan" }, { status: 404 });
    }

    await cancelInvitation(invitationId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("DELETE /api/workspaces/[id]/invitations error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
