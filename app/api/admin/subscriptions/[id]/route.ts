import { NextResponse } from "next/server";
import { withMonitoring } from "@/lib/monitoring";
import { requireBillingAdmin } from "@/lib/monitoring";
import { cancelSubscription } from "@/lib/subscriptions";

// DELETE /api/admin/subscriptions/:id
// Owner-gated immediate cancel (row kept for billing history).
async function DELETEHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const owner = await requireBillingAdmin();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const subscription = await cancelSubscription(id);
    return NextResponse.json(subscription);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan langganan";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export const DELETE = withMonitoring("admin-subscription", DELETEHandler);