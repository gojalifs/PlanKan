"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface MemberItem {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export function MemberList({
  workspaceId,
  members,
  isOwner,
  currentUserId,
}: {
  workspaceId: string;
  members: MemberItem[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Hapus ${name} dari workspace?`)) return;

    setBusyId(userId);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menghapus member");
        return;
      }

      toast.success("Member dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus member");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave() {
    if (!confirm("Keluar dari workspace ini?")) return;

    setBusyId("leave");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/leave`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal keluar dari workspace");
        return;
      }

      toast.success("Berhasil keluar dari workspace");
      router.push("/workspace");
      router.refresh();
    } catch {
      toast.error("Gagal keluar dari workspace");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={m.user.image || ""} alt={m.user.name} />
            <AvatarFallback>
              {m.user.name ? m.user.name.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {m.user.name}
              {m.userId === currentUserId && (
                <span className="text-muted-foreground"> (kamu)</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
          </div>
          <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
            {m.role === "OWNER" ? "Owner" : "Member"}
          </Badge>
          {isOwner && m.role !== "OWNER" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busyId === m.userId}
              onClick={() => handleRemove(m.userId, m.user.name)}
            >
              Hapus
            </Button>
          )}
        </div>
      ))}

      {!isOwner && (
        <Button
          variant="outline"
          className="w-full"
          disabled={busyId === "leave"}
          onClick={handleLeave}
        >
          Keluar dari Workspace
        </Button>
      )}
    </div>
  );
}
