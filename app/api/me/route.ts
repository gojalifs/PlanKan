import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { withMonitoring } from "@/lib/monitoring";

async function GETHandler(_request?: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: session.user });
}

export const GET = withMonitoring("me", GETHandler);
