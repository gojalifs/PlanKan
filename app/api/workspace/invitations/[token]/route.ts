import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import {
  acceptInvitation,
  declineInvitation,
  getInvitationByToken,
} from "@/lib/workspace";

type Params = { params: Promise<{ token: string }> };

function isUsable(invitation: { status: string; expiresAt: Date }) {
  if (invitation.status !== "PENDING") return "Invitation sudah diproses";
  if (invitation.expiresAt < new Date()) return "Invitation sudah expired";
  return null;
}

// Public: lihat detail invitation (untuk halaman /workspace/invite/[token]).
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation tidak ditemukan" }, { status: 404 });
    }

    const unusable = isUsable(invitation);
    if (unusable) {
      return NextResponse.json({ error: unusable }, { status: 400 });
    }

    return NextResponse.json({ invitation });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("GET /api/workspace/invitations/[token] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

// Accept: user login diambil dari session (bukan dari body — anti spoofing).
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const membership = await acceptInvitation(token, session.user.id);

    return NextResponse.json({ membership }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("POST /api/workspace/invitations/[token] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}

// Decline: cukup token rahasia sebagai otorisasi.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    const result = await declineInvitation(token);

    return NextResponse.json({ success: result }, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error("DELETE /api/workspace/invitations/[token] error:", error);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
