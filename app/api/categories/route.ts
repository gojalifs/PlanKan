import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { ensureUserStarterData } from "@/lib/default-categories";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  icon: z.string().default("Tag"),
  color: z.string().default("#64748b"),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserStarterData(session.user.id);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const categories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
        ...(type ? { type: type as any } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Error GET /api/categories:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCategorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        userId: session.user.id,
        name: validated.name,
        type: validated.type,
        icon: validated.icon,
        color: validated.color,
        isDefault: false,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error("Error POST /api/categories:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
