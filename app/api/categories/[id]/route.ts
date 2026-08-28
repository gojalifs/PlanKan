import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { z } from "zod";

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export async function PUT(
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

    const existing = await prisma.category.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ category: updated });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.category.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
