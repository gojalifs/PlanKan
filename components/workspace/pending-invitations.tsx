"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface PendingInvitation {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

function inviteLink(token: string) {
  if (typeof window === "undefined") return `/workspace/invite/${token}`;
  return `${window.location.origin}/workspace/invite/${token}`;
}

export function PendingInvitations({
  workspaceId,
  invitations,
}: {
  workspaceId: string;
  invitations: PendingInvitation[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success("Link invitation disalin");
    } catch {
      toast.error("Gagal menyalin link");
    }
  }

  async function handleCancel(invitationId: string) {
    setBusyId(invitationId);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations?invitationId=${encodeURIComponent(invitationId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal membatalkan invitation");
        return;
      }

      toast.success("Invitation dibatalkan");
      router.refresh();
    } catch {
      toast.error("Gagal membatalkan invitation");
    } finally {
      setBusyId(null);
    }
  }

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada invitation pending.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => (
        <div key={inv.id} className="rounded-lg border p-3">
          <p className="text-sm font-medium">{inv.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Berlaku sampai{" "}
            {new Date(inv.expiresAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-2 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
            {inviteLink(inv.token)}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleCopy(inv.token)}>
              Salin Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busyId === inv.id}
              onClick={() => handleCancel(inv.id)}
            >
              Batalkan
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
