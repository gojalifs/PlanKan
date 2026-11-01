import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { createWorkspace } from "@/lib/workspace";
import { currentPlanKey } from "@/lib/subscriptions";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: {
        workspace: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
            members: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        },
      },
    });

    const workspaces = userWorkspaces.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      type: m.workspace.type,
      role: m.role,
      isOwner: m.workspace.ownerId === session.user.id,
      memberCount: m.workspace.members.length,
      owner: m.workspace.owner,
    }));

    return NextResponse.json({ workspaces });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Workspace family hanya untuk user dengan plan FAMILY.
    const planKey = await currentPlanKey(session.user.id);
    if (planKey !== "FAMILY") {
      return NextResponse.json(
        {
          error: "Workspace keluarga hanya tersedia di paket Family. Upgrade paket untuk mengaktifkannya.",
          code: "FAMILY_PLAN_REQUIRED",
        },
        { status: 403 }
      );
    }

    // Design decision (family-workspace-plan.md): user hanya bisa join 1 workspace.
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Kamu sudah tergabung di sebuah workspace. Keluar dulu sebelum membuat yang baru." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama workspace wajib diisi" }, { status: 400 });
    }

    const workspace = await createWorkspace(session.user.id, name.trim());

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
