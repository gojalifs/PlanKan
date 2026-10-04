"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InviteActionButtons({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);

  async function handleAccept() {
    setLoading("accept");
    try {
      const res = await fetch(`/api/workspace/invitations/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menerima invitation");
        return;
      }

      toast.success("Berhasil bergabung ke workspace");
      router.push(`/workspace/${data.membership.workspaceId}`);
      router.refresh();
    } catch {
      toast.error("Gagal menerima invitation");
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    try {
      const res = await fetch(`/api/workspace/invitations/${token}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal menolak invitation");
        return;
      }

      toast.success("Invitation ditolak");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Gagal menolak invitation");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleAccept}
        disabled={loading !== null}
      >
        {loading === "accept" ? "Memproses..." : "Terima"}
      </Button>
      <Button
        variant="outline"
        onClick={handleDecline}
        disabled={loading !== null}
      >
        {loading === "decline" ? "Memproses..." : "Tolak"}
      </Button>
    </div>
  );
}
