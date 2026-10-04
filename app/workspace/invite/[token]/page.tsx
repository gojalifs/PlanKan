import Link from "next/link";
import { getServerSession } from "@/lib/auth-server";
import { getInvitationByToken } from "@/lib/workspace";
import { InviteActionButtons } from "@/components/workspace/invite-action-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession();

  const invitation = await getInvitationByToken(token);

  if (
    !invitation ||
    invitation.status !== "PENDING" ||
    invitation.expiresAt < new Date()
  ) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Invitation tidak valid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Link invitation ini tidak ditemukan, sudah diproses, atau sudah
              expired. Minta owner mengirim invitation baru.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Undangan Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="font-medium">{invitation.workspace.owner.name}</span>{" "}
              mengundangmu untuk bergabung ke workspace family{" "}
              <span className="font-medium">
                &ldquo;{invitation.workspace.name}&rdquo;
              </span>{" "}
              di PlanKan.
            </p>
            <p className="text-sm text-muted-foreground">
              Login dulu (dengan email {invitation.email}), lalu buka kembali
              link ini untuk menerima invitation.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/login">Masuk</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Daftar Akun</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.user.email !== invitation.email) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Email tidak cocok</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Invitation ini ditujukan untuk {invitation.email}, tapi kamu login
              sebagai {session.user.email}. Login dengan email yang diundang
              untuk melanjutkan.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Undangan Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <span className="font-medium">{invitation.workspace.owner.name}</span>{" "}
            mengundangmu untuk bergabung ke workspace family{" "}
            <span className="font-medium">
              &ldquo;{invitation.workspace.name}&rdquo;
            </span>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            Di workspace ini kamu bisa melihat dan mengelola shared wallets,
            budgets, dan financial goals keluarga.
          </p>
          <InviteActionButtons token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
