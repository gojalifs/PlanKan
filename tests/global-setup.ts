import { execSync } from "node:child_process";
import { Pool } from "pg";

const TABLES = [
  "workspace_invitation",
  "workspace_member",
  "workspace",
  "session",
  "account",
  "verification",
  "wallet",
  "category",
  "transaction",
  "budget",
  "budget_period_setting",
  "budget_period_override",
  "monthly_review",
  "financial_goal",
  "subscription_plan",
  "plan_entitlement",
  "subscription",
  "usage_record",
  "usage_lease",
  "api_log",
  "gemini_call_log",
  "user",
  "device_token",
  "sync_deletion",
];

export default async function setup() {
  const TEST_URL = process.env.DATABASE_URL_TEST ?? "";
  if (!TEST_URL) {
    throw new Error("DATABASE_URL_TEST belum diset di .env (vitest dibatalkan).");
  }
  // Set BEFORE any module touches lib/prisma (its pool is built from DATABASE_URL).
  process.env.DATABASE_URL = TEST_URL;

  // Keep the test schema in sync with prisma/schema.prisma (idempotent push).
  execSync(`pnpm exec prisma db push --url "${TEST_URL}"`, {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_URL },
  });

  // Fresh, empty slate every run. (`user` is a reserved word → quote identifiers.)
  const pool = new Pool({ connectionString: TEST_URL });
  await pool.query(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  await pool.end();

  // Lazy import so lib/prisma is constructed AFTER DATABASE_URL is overridden.
  const { seedDefaultPlans } = await import("@/lib/plans-config");
  await seedDefaultPlans();
}