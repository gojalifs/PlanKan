import { prisma } from "@/lib/prisma";

/**
 * Subscription resolution & lifecycle (monetise.md §14).
 *
 * Subscriptions are user-owned for now (Phase 2+3); workspace-owned comes with
 * the Family plan (Phase 7). Historical rows are NEVER deleted — cancel simply
 * flips status so state is auditable and billing history survives.
 */
export const ACTIVE_LIFECYCLE = ["TRIALING", "ACTIVE", "PAST_DUE"] as const;

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface CurrentPlan {
  planKey: string;
  plan: { id: string; key: string; name: string; priceMonthly: number } | null;
  subscription:
    | { id: string; status: SubscriptionStatus; currentPeriodEnd: Date; cancelAtPeriodEnd: boolean }
    | null;
}

/**
 * The user's effective plan: the newest subscription still inside its billing
 * period, otherwise FREE. Derived at request time — no scheduled job needed.
 *
 * Workspace-aware (Family plan): a member inherits the subscription owned by
 * their workspace. If the workspace has no active subscription yet, we fall
 * back to the user's own personal subscription.
 */
export async function currentPlan(userId: string): Promise<CurrentPlan> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { workspaceId: true },
  });

  const now = new Date();

  let sub = membership
    ? await prisma.subscription.findFirst({
        where: {
          workspaceId: membership.workspaceId,
          status: { in: [...ACTIVE_LIFECYCLE] },
          currentPeriodEnd: { gt: now },
        },
        include: { plan: true },
        orderBy: { currentPeriodEnd: "desc" },
      })
    : null;

  if (!sub) {
    sub = await prisma.subscription.findFirst({
      where: {
        userId,
        workspaceId: null,
        status: { in: [...ACTIVE_LIFECYCLE] },
        currentPeriodEnd: { gt: now },
      },
      include: { plan: true },
      orderBy: { currentPeriodEnd: "desc" },
    });
  }

  if (!sub) {
    return { planKey: "FREE", plan: null, subscription: null };
  }
  return {
    planKey: sub.plan.key,
    plan: {
      id: sub.plan.id,
      key: sub.plan.key,
      name: sub.plan.name,
      priceMonthly: sub.plan.priceMonthly,
    },
    subscription: {
      id: sub.id,
      status: sub.status as SubscriptionStatus,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  };
}

export async function currentPlanKey(userId: string): Promise<string> {
  return (await currentPlan(userId)).planKey;
}

export interface GrantOptions {
  days?: number;
  months?: number;
  status?: SubscriptionStatus;
}

/**
 * Admin-grant (Phase 3 billing is manual): creates a subscription window for a
 * user. Any existing in-lifecycle subscription is closed (CANCELLED) so history
 * is preserved — enough for MVP without a payment provider.
 */
export async function grantSubscription(
  userId: string,
  planKey: string,
  opts: GrantOptions = {}
) {
  const plan = await prisma.plan.findUnique({ where: { key: planKey } });
  if (!plan) throw new Error(`Plan "${planKey}" tidak ditemukan. Seed plans dulu.`);

  // Family plan: subscription mengikuti workspace tempat user bergabung.
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { workspaceId: true },
  });
  const workspaceId = membership?.workspaceId ?? null;

  await prisma.subscription.updateMany({
    where: {
      OR: [
        { userId, workspaceId: null },
        ...(workspaceId ? [{ workspaceId }] : []),
      ],
      status: { in: [...ACTIVE_LIFECYCLE] },
    },
    data: { status: "CANCELLED" },
  });

  const periodDays =
    opts.days ??
    Math.round((opts.months ?? 1) * 30.44);

  const now = new Date();
  return prisma.subscription.create({
    data: {
      userId,
      workspaceId,
      planId: plan.id,
      status: (opts.status ?? "ACTIVE") as SubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + periodDays * 86_400_000),
    },
    include: { plan: true },
  });
}

/** Immediate cancel (helpers that keep the row for history). */
export async function cancelSubscription(subscriptionId: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", cancelAtPeriodEnd: true },
  });
}