import { prisma } from "@/lib/prisma";

const THROTTLE_MS = 60_000;
let lastCleanup = 0;

/**
 * Opportunistic cleanup of old monitoring rows.
 * Runs at most once per minute, fire-and-forget.
 * Mirrors the pattern used by `cleanupStaleReceipts`.
 */
export async function maybeCleanupMonitoring(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanup < THROTTLE_MS) return;
  lastCleanup = now;

  try {
    const retentionDays = Number(process.env.MONITORING_RETENTION_DAYS) || 30;
    const cutoff = new Date(now - retentionDays * 86_400_000);
    await prisma.apiLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  } catch {
    // swallow — cleanup is best-effort
  }

  try {
    const geminiDays = Number(process.env.MONITORING_GEMINI_RETENTION_DAYS) || 90;
    const cutoff = new Date(now - geminiDays * 86_400_000);
    await prisma.geminiCallLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  } catch {
    // swallow
  }
}
