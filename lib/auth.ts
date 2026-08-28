import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "plankan-super-secret-key-32-chars-long-at-least!",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://budget.twogether.click",
  trustedOrigins: [
    "https://budget.twogether.click",
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean),
});

