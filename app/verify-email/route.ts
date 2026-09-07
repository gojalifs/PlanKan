import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const callbackURL = searchParams.get("callbackURL") || "/email-verified";

  const apiParams = new URLSearchParams();
  if (token) apiParams.set("token", token);
  apiParams.set("callbackURL", callbackURL);

  return NextResponse.redirect(
    new URL(`/api/auth/verify-email?${apiParams.toString()}`, req.url)
  );
}