import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { getLimit } from "@/lib/entitlement";

/**
 * Usage tracking & atomic quota enforcement (monetise.md §11–13).
 *
 * Quota is enforced server-side. Each (user, feature, period) gets a
 * `usage_lease` row whose `used`/`limit`/`bonus` counters are the source of
 * truth; `usage_record` is an append-only ledger for analytics/audit.
 *
 * `consume()` reserves atomically via a guarded UPDATE (`WHERE used + qty
 * <= limit + bonus`) so N parallel requests can never overdraw the counter.
 */
export const WIB_OFFSET_HOURS = 7;

/** Calendar-month quota key in WIB, e.g. "2026-09". */
export function periodKey(date: Date = new Date()): string {
  const d = new Date(date.getTime() + WIB_OFFSET_HOURS * 3600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface UsageStatus {
  feature: string;
  period: string;
  used: number;
  limit: number | null; // null == unlimited
  bonus: number; // non-recurring grace (e.g. one-time welcome bonus)
  remaining: number | null; // null == unlimited
}

export interface ConsumeResult {
  ok: boolean;
  refId?: string;
  status: UsageStatus;
}

function limitKey(feature: string): string {
  return `${feature}.monthly_limit`;
}

async function resolveMonthlyLimit(userId: string, feature: string): Promise<number | null> {
  return getLimit(userId, limitKey(feature));
}

/** Current live status without consuming anything. */
export async function getUsage(
  userId: string,
  feature: string,
  period: string = periodKey()
): Promise<UsageStatus> {
  const limit = await resolveMonthlyLimit(userId, feature);

  // Unlimited: sum the ledger (few rows for these features).
  if (limit === null) {
    const agg = await prisma.usageRecord.aggregate({
      where: { userId, feature, period },
      _sum: { quantity: true },
    });
    return { feature, period, used: agg._sum.quantity ?? 0, limit: null, bonus: 0, remaining: null };
  }

  const lease = await prisma.usageLease.findUnique({
    where: { userId_feature_period: { userId, feature, period } },
  });
  if (!lease) {
    return { feature, period, used: 0, limit, bonus: 0, remaining: limit };
  }
  const remaining = Math.max(0, lease.limit + lease.bonus - lease.used);
  return {
    feature,
    period,
    used: lease.used,
    limit: lease.limit,
    bonus: lease.bonus,
    remaining,
  };
}

/**
 * Try to consume `qty` from the user's quota. Returns `{ ok: false }` when the
 * user is over quota — the parallel-race-safe UPDATE guarantees the counter
 * never goes negative and no more than `limit + bonus` total is ever granted.
 * Each successful consume also writes a UsageRecord (ledger) so the ocr
 * feature's usage stays measurable via the same rows.
 */
export async function consume(
  userId: string,
  feature: string,
  opts: { qty?: number; period?: string; source?: string; refId?: string } = {}
): Promise<ConsumeResult> {
  const period = opts.period ?? periodKey();
  const qty = opts.qty ?? 1;
  const source = opts.source ?? "SUBSCRIPTION";
  const limit = await resolveMonthlyLimit(userId, feature);

  // Unlimited plan: no lease, just record the ledger for analytics.
  if (limit === null) {
    const refId = opts.refId ?? randomUUID();
    await prisma.usageRecord.create({
      data: { userId, feature, quantity: qty, period, source, refId },
    });
    return { ok: true, refId, status: await getUsage(userId, feature, period) };
  }

  // Make sure a lease exists with a fresh limit snapshot (plan may have changed).
  await prisma.usageLease.upsert({
    where: { userId_feature_period: { userId, feature, period } },
    create: { userId, feature, period, used: 0, limit },
    update: { limit, updatedAt: new Date() },
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw(Prisma.sql`
      UPDATE "usage_lease"
      SET "used" = "used" + ${qty}, "updatedAt" = ${new Date()}
      WHERE "userId" = ${userId} AND "feature" = ${feature} AND "period" = ${period}
        AND "used" + ${qty} <= "limit" + "bonus"
    `);

    const lease = await tx.usageLease.findUnique({
      where: { userId_feature_period: { userId, feature, period } },
    });
    const status: UsageStatus = {
      feature,
      period,
      used: lease?.used ?? 0,
      limit: lease?.limit ?? limit,
      bonus: lease?.bonus ?? 0,
      remaining: lease ? Math.max(0, lease.limit + lease.bonus - lease.used) : limit,
    };

    if (updated === 0) {
      return { ok: false, status };
    }

    const refId = opts.refId ?? randomUUID();
    await tx.usageRecord.create({
      data: { userId, feature, quantity: qty, period, source, refId },
    });
    return { ok: true, refId, status };
  });
}

/**
 * Refund one failed OCR/voice call (identified by refId) so a failed AI call
 * never silently burns quota. Idempotent — the ledger row is zeroed so a
 * second refund of the same refId is a no-op.
 */
export async function refund(userId: string, feature: string, refId?: string): Promise<void> {
  if (!refId) return;
  const record = await prisma.usageRecord.findFirst({
    where: { userId, feature, refId, quantity: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "usage_lease"
      SET "used" = GREATEST("used" - ${record.quantity}, 0), "updatedAt" = ${new Date()}
      WHERE "userId" = ${userId} AND "feature" = ${feature} AND "period" = ${record.period}
    `);
    await tx.usageRecord.update({ where: { id: record.id }, data: { quantity: 0 } });
  });
}

/**
 * One-time welcome OCR bonus (monetise.md §2). Adds `ocr.welcome_bonus` grace
 * to the shared ocr pool for the current period, guarded by
 * `User.welcomeBonusClaimedAt`. A ledger GRANT row keeps it auditable.
 */
export async function applyWelcomeBonus(userId: string, feature = "ocr"): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { welcomeBonusClaimedAt: true },
  });
  if (user?.welcomeBonusClaimedAt) return;

  const welcomeAmount = (await getLimit(userId, "ocr.welcome_bonus")) ?? 0;
  if (welcomeAmount <= 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { welcomeBonusClaimedAt: new Date() },
    });
    return;
  }

  const period = periodKey();
  const limitNow = await resolveMonthlyLimit(userId, feature);
  if (limitNow === null) {
    // Unlimited plan: nothing to grant into.
    return;
  }

  const refId = `welcome:${userId}`;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { welcomeBonusClaimedAt: new Date() },
    });
    await tx.usageLease.upsert({
      where: { userId_feature_period: { userId, feature, period } },
      create: { userId, feature, period, used: 0, limit: limitNow, bonus: welcomeAmount },
      update: { bonus: { increment: welcomeAmount } },
    });
    await tx.usageRecord.create({
      data: { userId, feature, quantity: 0, period, source: "GRANT", refId },
    });
  });
}