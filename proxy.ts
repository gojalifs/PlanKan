import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function allowedOrigins(): string[] {
  const fromEnv = (process.env.MOBILE_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [
    "https://budget.twogether.click",
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
    ...fromEnv,
  ].filter(Boolean);
}

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, X-Requested-With, Idempotency-Key, X-Request-Id";
const CORS_EXPOSE = "set-auth-token, X-Request-Id, X-API-Version";

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const isAllowed = origin !== "" && allowed.includes(origin);
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  if (request.method === "OPTIONS") {
    const headers: Record<string, string> = {
      "Access-Control-Allow-Methods": CORS_METHODS,
      "Access-Control-Allow-Headers": CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
      "X-Request-Id": requestId,
      "X-API-Version": "v1",
    };
    if (isAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Credentials"] = "true";
      headers["Access-Control-Expose-Headers"] = CORS_EXPOSE;
    }
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-API-Version", "v1");
  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Expose-Headers", CORS_EXPOSE);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/transactions/:path*"],
};
