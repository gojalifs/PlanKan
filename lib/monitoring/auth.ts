import { getServerSession } from "@/lib/auth-server";

/**
 * Admin emails for monitoring access from MONITORING_OWNER_EMAIL.
 * Supports multiple admins separated by commas: "a@x.com,b@x.com".
 * Whitespace and casing are normalized; empty result = everyone may access.
 */
export function getOwnerEmails(): string[] {
  return (process.env.MONITORING_OWNER_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Owner-gate for monitoring read APIs and the /monitoring page.
 * Returns the session user if allowed, null otherwise.
 *
 * - If MONITORING_OWNER_EMAIL is set → only listed emails may access.
 * - If unset → any authenticated user (personal single-owner app).
 */
export async function requireMonitoringOwner() {
  const session = await getServerSession();
  if (!session?.user) return null;

  const emails = getOwnerEmails();
  if (emails.length > 0 && !emails.includes(session.user.email.toLowerCase())) {
    return null;
  }

  return session.user;
}