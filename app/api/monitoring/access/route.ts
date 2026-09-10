import { NextResponse } from "next/server";
import { requireMonitoringOwner } from "@/lib/monitoring";

/**
 * Client-facing access gate for the /monitoring page and navbar link.
 * Single source of truth lives in MONITORING_OWNER_EMAIL (server-side).
 *
 * Deliberately NOT wrapped in withMonitoring — logging a self-gate check
 * (especially its 401s) would add noise to the very data it protects.
 */
export async function GET() {
  const user = await requireMonitoringOwner();
  return NextResponse.json({ canAccess: Boolean(user) });
}