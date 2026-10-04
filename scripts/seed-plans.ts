/**
 * Idempotent seed for subscription plans + entitlements (monetise.md §10).
 * Runs against the DB in DATABASE_URL. Safe to run repeatedly.
 *
 * Jalan:  pnpm seed:plans
 */
import "dotenv/config";
import { seedDefaultPlans } from "../lib/plans-config";

async function main() {
  await seedDefaultPlans();
  console.log("✅ Plan & entitlement seeded (FREE/STARTER/PLUS/PRO/FAMILY).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});