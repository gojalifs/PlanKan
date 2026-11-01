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

// Simple in-memory rate limiter (per instance). Suitable for brute-force
// protection on auth/device endpoints; replace with shared store for scale.
const rateLimitBuckets = new Map<string, { count: number; reset: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  if (rateLimitBuckets.size > 10000) {
    for (const [k, v] of rateLimitBuckets) {
      if (v.reset <= now) rateLimitBuckets.delete(k);
    }
  }
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    rateLimitBuckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, reset: bucket.reset };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, reset: bucket.reset };
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const isAllowed = origin !== "" && allowed.includes(origin);
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  const pathname = request.nextUrl.pathname;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  let rateLimit: { allowed: boolean; remaining: number; reset: number } | null = null;
  if (pathname.startsWith("/api/auth")) {
    rateLimit = checkRateLimit(`auth:${ip}`, 20, 60_000);
  } else if (pathname.startsWith("/api/devices")) {
    rateLimit = checkRateLimit(`devices:${ip}`, 60, 60_000);
  }

  if (rateLimit && !rateLimit.allowed) {
    return new NextResponse(
      JSON.stringify({ error: "Terlalu banyak permintaan, coba lagi nanti" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
          "X-Request-Id": requestId,
        },
      }
    );
  }

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
  if (rateLimit) {
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.reset / 1000)));
  }
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
