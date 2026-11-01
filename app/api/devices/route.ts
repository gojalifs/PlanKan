import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { z } from "zod";
import { withMonitoring } from "@/lib/monitoring";

const registerSchema = z.object({
  platform: z.enum(["android", "ios", "web"]),
  token: z.string().min(1),
});

async function POSTHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);

    const device = await prisma.deviceToken.upsert({
      where: { token: validated.token },
      update: {
        userId: session.user.id,
        platform: validated.platform,
        lastSeenAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: validated.platform,
        token: validated.token,
      },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "ZodError") {
      return NextResponse.json({ error: (error as { errors?: { message: string }[] }).errors?.[0]?.message }, { status: 400 });
    }
    console.error("Error POST /api/devices:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function DELETEHandler(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token wajib diisi" }, { status: 400 });
    }

    await prisma.deviceToken.deleteMany({
      where: { userId: session.user.id, token },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error DELETE /api/devices:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withMonitoring("devices", POSTHandler);
export const DELETE = withMonitoring("devices", DELETEHandler);
