import path from "node:path";
import { defineConfig } from "vitest/config";
import "dotenv/config";

const testUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: testUrl,
      NODE_ENV: "test",
      MONITORING_ENABLED: "false",
    },
    // One serial worker against the single shared test DB (atomic-race test needs it).
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 60_000,
    testTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
  },
});