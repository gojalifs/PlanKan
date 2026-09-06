import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "PlanKan <no-reply@budget.twogether.click>",
        to: user.email,
        subject: "Reset Password - PlanKan",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a;">Halo ${user.name},</h2>
            <p style="color: #475569; line-height: 1.6;">
              Anda telah meminta reset password untuk akun PlanKan Anda.
            </p>
            <p style="color: #475569; line-height: 1.6;">
              Klik tombol di bawah untuk mereset password Anda:
            </p>
            <a href="${url}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
              Reset Password
            </a>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
              Link ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.
            </p>
          </div>
        `,
      });
    },
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

