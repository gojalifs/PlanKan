import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { getAccessScope } from "@/lib/workspace";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  parentId: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

async function PUTHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateCategorySchema.parse(body);

    const { or } = await getAccessScope(session.user.id);
    const existing = await prisma.category.findFirst({
      where: { id, OR: or },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    if (validated.parentId !== undefined) {
      if (validated.parentId === id) {
        return NextResponse.json(
          { error: "Kategori tidak dapat menjadi sub-kategori dari dirinya sendiri" },
          { status: 400 }
        );
      }

      if (validated.parentId) {
        const parentCat = await prisma.category.findFirst({
          where: { id: validated.parentId, OR: or },
        });
        if (!parentCat) {
          return NextResponse.json({ error: "Parent kategori tidak ditemukan" }, { status: 400 });
        }
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: validated,
      include: {
        parent: true,
        children: true,
      },
    });

    return NextResponse.json({ category: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function DELETEHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { or } = await getAccessScope(session.user.id);
    const existing = await prisma.category.findFirst({
      where: { id, OR: or },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    await prisma.category.delete({
      where: { id },
    });

    await prisma.syncDeletion.create({
      data: {
        entityType: "category",
        entityId: id,
        userId: session.user.id,
        workspaceId: existing.workspaceId,
      },
    });

    return NextResponse.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export const PUT = withMonitoring("categories/[id]", PUTHandler);
export const DELETE = withMonitoring("categories/[id]", DELETEHandler);
