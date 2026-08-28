import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getServerSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({
    headers: reqHeaders,
  });
}

export async function requireUser() {
  const session = await getServerSession();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
