import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import {
  getWorkspace,
  getPendingInvitations,
  MAX_FAMILY_MEMBERS,
} from "@/lib/workspace";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";
import { MemberList } from "@/components/workspace/member-list";
import { PendingInvitations } from "@/components/workspace/pending-invitations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id: workspaceId } = await params;

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, status: "ACTIVE" },
  });

  if (!membership) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Akses ditolak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kamu tidak memiliki akses ke workspace ini.
            </p>
            <Button asChild variant="outline">
              <Link href="/workspace">Kembali ke daftar workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workspace = await getWorkspace(workspaceId);

  if (!workspace) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p>Workspace tidak ditemukan.</p>
      </div>
    );
  }

  const isOwner = workspace.ownerId === session.user.id;
  const invitations = isOwner ? await getPendingInvitations(workspaceId) : [];

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            {workspace.members.length}/{MAX_FAMILY_MEMBERS} member
          </p>
        </div>
        {isOwner && <InviteMemberDialog workspaceId={workspace.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList
            workspaceId={workspace.id}
            members={workspace.members}
            isOwner={isOwner}
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Invitation Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInvitations
              workspaceId={workspace.id}
              invitations={invitations.map((inv) => ({
                ...inv,
                expiresAt: inv.expiresAt.toISOString(),
                createdAt: inv.createdAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
