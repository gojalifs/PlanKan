import nodemailer from "nodemailer";

/**
 * Pengiriman email transaksional PlanKan (di luar email auth di lib/auth.ts).
 *
 * Konfigurasi via env yang sama: SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS / SMTP_FROM. Jika SMTP_HOST tidak diset, pengiriman di-skip
 * (caller menerima { sent: false }) agar fitur tetap jalan di dev
 * tanpa mail server.
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export interface WorkspaceInvitationEmail {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}

export async function sendWorkspaceInvitationEmail({
  to,
  inviterName,
  workspaceName,
  inviteUrl,
}: WorkspaceInvitationEmail): Promise<{ sent: boolean; reason?: string }> {
  const mailer = getTransporter();

  if (!mailer) {
    return { sent: false, reason: "SMTP belum dikonfigurasi" };
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || "PlanKan <no-reply@budget.twogether.click>",
    to,
    subject: `${inviterName} mengundangmu ke Workspace Family PlanKan`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a;">Halo,</h2>
        <p style="color: #475569; line-height: 1.6;">
          <strong>${escapeHtml(inviterName)}</strong> mengundangmu untuk bergabung
          ke workspace family <strong>&ldquo;${escapeHtml(workspaceName)}&rdquo;</strong> di PlanKan.
        </p>
        <p style="color: #475569; line-height: 1.6;">
          Di workspace ini, kamu bisa:
        </p>
        <ul style="color: #475569; line-height: 1.8;">
          <li>Lihat dan kelola shared wallets</li>
          <li>Buat shared budgets</li>
          <li>Track family financial goals</li>
          <li>Lihat family reports</li>
        </ul>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Terima Invitation
        </a>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          Link ini berlaku 7 hari. Jika tombol tidak berfungsi, salin link berikut ke browser:<br />
          <span style="word-break: break-all;">${inviteUrl}</span>
        </p>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
          &mdash; PlanKan Team
        </p>
      </div>
    `,
  });

  return { sent: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
