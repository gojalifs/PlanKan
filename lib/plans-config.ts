import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Pricing & entitlements source of truth (per monetise.md §10, §20).
 *
 * `DEFAULT_PLANS` is ONLY a fallback/seed baseline so the app never breaks on
 * an empty DB. Once seeded, `subscription_plan` / `plan_entitlement` rows are
 * authoritative and can be edited without touching code.
 */
export type FeatureValue = string | number | boolean | null;
export type FeatureMap = Record<string, FeatureValue>;

export const PLAN_KEYS = ["FREE", "STARTER", "PLUS", "PRO", "FAMILY"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export interface DefaultPlan {
  key: PlanKey;
  name: string;
  priceMonthly: number;
  sortOrder: number;
  entitlements: FeatureMap;
}

export const DEFAULT_PLANS: DefaultPlan[] = [
  {
    key: "FREE",
    name: "Free",
    priceMonthly: 0,
    sortOrder: 0,
    entitlements: {
      "ocr.monthly_limit": 5, // shared pool: receipt OCR + voice input
      "ocr.welcome_bonus": 10, // one-time, applied to the first period only
      "ocr.rollover": false, // unused quota expires at period end
      "wallet.limit": 5,
      "budget.limit": 5,
      "transactions.unlimited": true,
      "export.csv": false,
      "export.excel": false,
      "ai.voice_input": false, // informational only — voice shares the ocr pool
      "ai.auto_category": false,
      "ai.monthly_review": false,
      "ai.financial_goals": false,
      "ai.forecast": false,
      "history.years": 1,
    },
  },
  {
    key: "STARTER",
    name: "Starter",
    priceMonthly: 4_990,
    sortOrder: 10,
    entitlements: {
      "ocr.monthly_limit": 50,
      "ocr.welcome_bonus": 10,
      "ocr.rollover": false,
      "wallet.limit": 20,
      "budget.limit": 50,
      "transactions.unlimited": true,
      "export.csv": true,
      "export.excel": false,
      "ai.voice_input": true,
      "ai.auto_category": false,
      "ai.monthly_review": false,
      "ai.financial_goals": false,
      "ai.forecast": false,
      "history.years": 3,
    },
  },
  {
    key: "PLUS",
    name: "Plus",
    priceMonthly: 14_990,
    sortOrder: 20,
    entitlements: {
      "ocr.monthly_limit": 200,
      "ocr.welcome_bonus": 10,
      "ocr.rollover": false,
      "wallet.limit": null,
      "budget.limit": null,
      "transactions.unlimited": true,
      "export.csv": true,
      "export.excel": true,
      "ai.voice_input": true,
      "ai.auto_category": true,
      "ai.monthly_review": true,
      "ai.financial_goals": true,
      "ai.forecast": false,
      "history.years": null,
    },
  },
  {
    key: "PRO",
    name: "Pro",
    priceMonthly: 29_990,
    sortOrder: 30,
    entitlements: {
      "ocr.monthly_limit": 500,
      "ocr.welcome_bonus": 10,
      "ocr.rollover": false,
      "wallet.limit": null,
      "budget.limit": null,
      "transactions.unlimited": true,
      "export.csv": true,
      "export.excel": true,
      "ai.voice_input": true,
      "ai.auto_category": true,
      "ai.monthly_review": true,
      "ai.financial_goals": true,
      "ai.forecast": true,
      "history.years": null,
    },
  },
  {
    key: "FAMILY",
    name: "Family",
    priceMonthly: 59_990,
    sortOrder: 40,
    entitlements: {
      "ocr.monthly_limit": 1_500, // shared across the workspace (Phase 7)
      "ocr.welcome_bonus": 10,
      "ocr.rollover": false,
      "wallet.limit": null,
      "budget.limit": null,
      "transactions.unlimited": true,
      "export.csv": true,
      "export.excel": true,
      "ai.voice_input": true,
      "ai.auto_category": true,
      "ai.monthly_review": true,
      "ai.financial_goals": true,
      "ai.forecast": true,
      "history.years": null,
      "workspace.max_members": 5,
      "workspace.shared_wallets": true,
      "workspace.shared_budgets": true,
      "workspace.member_roles": true,
    },
  },
];

export function getBaselineEntitlements(planKey: string): FeatureMap {
  return DEFAULT_PLANS.find((p) => p.key === planKey)?.entitlements ?? {};
}

/** Idempotent seed: upsert plans + their entitlement rows. Safe to run repeatedly. */
export async function seedDefaultPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    const row = await prisma.plan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        sortOrder: plan.sortOrder,
        active: true,
      },
      create: {
        key: plan.key,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        sortOrder: plan.sortOrder,
      },
    });

    for (const [feature, value] of Object.entries(plan.entitlements)) {
      await prisma.planEntitlement.upsert({
        where: { planId_feature: { planId: row.id, feature } },
        update: { value: value as Prisma.InputJsonValue },
        create: { planId: row.id, feature, value: value as Prisma.InputJsonValue },
      });
    }
  }
}