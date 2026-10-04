import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function WorkspaceListPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: {
      workspace: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
    },
  });

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspace Keluarga</h1>
          <p className="text-sm text-muted-foreground">
            Kelola keuangan bersama dalam satu workspace Family (maks. 5 member).
          </p>
        </div>
      </div>

      {memberships.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum ada workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Buat workspace family untuk berbagi dompet, budget, dan tujuan
              keuangan dengan pasangan atau keluargamu.
            </p>
            <CreateWorkspaceDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {memberships.map((m) => (
            <Card key={m.workspace.id}>
              <CardHeader>
                <CardTitle>{m.workspace.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {m.workspace.members.length}/5 member &middot;{" "}
                  {m.role === "OWNER" ? "Owner" : "Member"}
                </p>
                <Button asChild>
                  <Link href={`/workspace/${m.workspace.id}`}>
                    Masuk ke workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
